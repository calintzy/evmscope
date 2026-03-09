import { z } from "zod";
import { formatEther, formatGwei, decodeFunctionData, decodeEventLog, parseAbi } from "viem";
import type { Abi } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeSuccess, makeError, isSupportedChain } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { getABI, lookup4byte } from "../shared/etherscan.js";
import { cache } from "../shared/cache.js";
import signaturesData from "../data/signatures.json" with { type: "json" };

interface DecodedFunction {
  name: string;
  signature: string | null;
  args: Record<string, unknown>;
}

interface DecodedEvent {
  name: string;
  address: string;
  args: Record<string, unknown>;
}

interface DecodeTxData {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  status: "success" | "failed" | "pending";
  function: DecodedFunction | null;
  events: DecodedEvent[];
  gasUsed: string | null;
  gasPrice: string | null;
  blockNumber: number | null;
  timestamp: number | null;
}

const DECODE_CACHE_TTL = 300; // 5분

const inputSchema = z.object({
  txHash: z.string().describe("트랜잭션 해시 (0x...)"),
  chain: z.string().default("ethereum").describe("체인 (ethereum, polygon, arbitrum, base, optimism)"),
});

/** 4byte 셀렉터로 로컬 DB 또는 4byte.directory에서 함수명 조회 */
async function resolveFunctionSelector(selector: string): Promise<{ name: string; signature: string } | null> {
  // 로컬 DB 먼저
  const sigs = signaturesData as Record<string, { name: string; signature: string }>;
  if (sigs[selector]) return sigs[selector];

  // 4byte.directory 폴백
  const remoteSig = await lookup4byte(selector);
  if (remoteSig) {
    const name = remoteSig.split("(")[0];
    return { name, signature: remoteSig };
  }

  return null;
}

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<DecodeTxData>> {
  const { txHash, chain } = args;

  if (!isSupportedChain(chain)) {
    return makeError(`Unsupported chain: ${chain}`, "CHAIN_NOT_SUPPORTED");
  }

  if (!txHash.startsWith("0x") || txHash.length !== 66) {
    return makeError(`Invalid transaction hash: ${txHash}`, "INVALID_INPUT");
  }

  const cacheKey = `decodetx:${chain}:${txHash.toLowerCase()}`;
  const cached = cache.get<DecodeTxData>(cacheKey);
  if (cached.hit) return makeSuccess(chain as SupportedChain, cached.data, true);

  const client = getClient(chain as SupportedChain);

  try {
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` });

    let status: "success" | "failed" | "pending" = "pending";
    let gasUsed: string | null = null;
    let gasPrice: string | null = null;
    let timestamp: number | null = null;
    let logs: Array<{ address: string; data: string; topics: string[] }> = [];

    if (tx.blockNumber) {
      try {
        const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
        status = receipt.status === "success" ? "success" : "failed";
        gasUsed = receipt.gasUsed.toString();
        gasPrice = formatGwei(receipt.effectiveGasPrice);
        logs = receipt.logs.map((l) => ({
          address: l.address,
          data: l.data,
          topics: l.topics as string[],
        }));
      } catch {
        status = "success";
      }

      try {
        const block = await client.getBlock({ blockNumber: tx.blockNumber });
        timestamp = Number(block.timestamp);
      } catch {
        // 무시
      }
    }

    // 함수 디코딩
    let decodedFunction: DecodedFunction | null = null;
    const inputData = tx.input;

    if (inputData && inputData !== "0x" && inputData.length >= 10) {
      const selector = inputData.slice(0, 10);

      // ABI가 있으면 정밀 디코딩
      if (tx.to) {
        const abiResult = await getABI(tx.to, chain as SupportedChain);
        if (abiResult) {
          try {
            const decoded = decodeFunctionData({
              abi: abiResult.abi as Abi,
              data: inputData as `0x${string}`,
            });
            decodedFunction = {
              name: decoded.functionName,
              signature: null,
              // decoded.args는 readonly 배열일 수 있으므로 unknown으로 먼저 변환 후 직렬화
              args: decoded.args ? Object.fromEntries(
                Object.entries(decoded.args as unknown as Record<string, unknown>).map(([k, v]) => [k, serializeArg(v)])
              ) : {},
            };
          } catch {
            // ABI 디코딩 실패 시 셀렉터 폴백
          }
        }
      }

      // ABI 디코딩 실패 시 셀렉터 기반 조회
      if (!decodedFunction) {
        const sigInfo = await resolveFunctionSelector(selector);
        if (sigInfo) {
          decodedFunction = {
            name: sigInfo.name,
            signature: sigInfo.signature,
            args: { _raw: inputData },
          };
        } else {
          decodedFunction = {
            name: `unknown(${selector})`,
            signature: null,
            args: { _raw: inputData },
          };
        }
      }
    }

    // 이벤트 로그 디코딩
    const decodedEvents: DecodedEvent[] = [];
    for (const log of logs) {
      // ABI가 있으면 디코딩 시도
      const logAbiResult = await getABI(log.address, chain as SupportedChain);
      if (logAbiResult) {
        try {
          const decoded = decodeEventLog({
            abi: logAbiResult.abi as Abi,
            data: log.data as `0x${string}`,
            topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
          });
          decodedEvents.push({
            // eventName이 undefined일 수 있으므로 fallback 처리
            name: decoded.eventName ?? "unknown",
            address: log.address,
            // decoded.args는 readonly 배열일 수 있으므로 unknown으로 먼저 변환 후 직렬화
            args: decoded.args ? Object.fromEntries(
              Object.entries(decoded.args as unknown as Record<string, unknown>).map(([k, v]) => [k, serializeArg(v)])
            ) : {},
          });
          continue;
        } catch {
          // 디코딩 실패 시 raw 로그
        }
      }

      decodedEvents.push({
        name: log.topics[0]?.slice(0, 10) ?? "unknown",
        address: log.address,
        args: { _topics: log.topics, _data: log.data },
      });
    }

    const data: DecodeTxData = {
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: formatEther(tx.value),
      status,
      function: decodedFunction,
      events: decodedEvents,
      gasUsed,
      gasPrice,
      blockNumber: tx.blockNumber ? Number(tx.blockNumber) : null,
      timestamp,
    };

    if (status !== "pending") {
      cache.set(cacheKey, data, DECODE_CACHE_TTL);
    }

    return makeSuccess(chain as SupportedChain, data, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found") || message.includes("could not be found")) {
      return makeError(`Transaction not found: ${txHash}`, "TX_NOT_FOUND");
    }
    return makeError(`Failed to decode transaction: ${message}`, "RPC_ERROR");
  }
}

/** BigInt 등을 JSON 직렬화 가능하게 변환 */
function serializeArg(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializeArg);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serializeArg(v)])
    );
  }
  return value;
}

export function register(server: McpServer) {
  server.tool(
    "decodeTx",
    "트랜잭션을 구조화된 JSON으로 해석합니다 (함수명, 파라미터, 이벤트 로그, 가스 정보)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
