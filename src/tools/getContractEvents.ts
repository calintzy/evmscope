import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { getABI } from "../shared/etherscan.js";
import { cache } from "../shared/cache.js";
import { decodeEventLog, type Abi } from "viem";

interface EventData {
  name: string | null;
  args: Record<string, unknown> | null;
  txHash: string | null;
  blockNumber: number;
  logIndex: number;
}

interface ContractEventsData {
  address: string;
  events: EventData[];
  count: number;
  fromBlock: number;
  toBlock: number;
}

const inputSchema = z.object({
  address: z.string().describe("컨트랙트 주소 (0x...)"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
  fromBlock: z.number().optional().describe("시작 블록 (기본: 최근 1000블록)"),
  limit: z.number().optional().default(20).describe("최대 이벤트 수 (기본 20)"),
});

/** BigInt 등 직렬화 불가 타입 변환 */
function serializeArgs(args: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === "bigint") {
      result[key] = value.toString();
    } else if (Array.isArray(value)) {
      result[key] = value.map((v) => (typeof v === "bigint" ? v.toString() : v));
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<ContractEventsData>> {
  const { address, chain, limit } = args;

  if (!address.startsWith("0x") || address.length !== 42) {
    return makeError("Invalid address format", "INVALID_INPUT");
  }

  const cacheKey = `events:${chain}:${address.toLowerCase()}:${args.fromBlock ?? "latest"}:${limit}`;
  const cached = cache.get<ContractEventsData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  try {
    const client = getClient(chain);
    const latestBlock = await client.getBlockNumber();
    const fromBlock = args.fromBlock ? BigInt(args.fromBlock) : latestBlock - 1000n;
    const toBlock = latestBlock;

    // 로그 조회
    const logs = await client.getLogs({
      address: address as `0x${string}`,
      fromBlock,
      toBlock,
    });

    // ABI 조회 시도 (이벤트 디코딩용)
    let abi: Abi | null = null;
    try {
      const abiResult = await getABI(address, chain);
      if (abiResult) abi = abiResult.abi as Abi;
    } catch {
      // ABI 없으면 raw 로그 반환
    }

    const events: EventData[] = [];
    for (const log of logs.slice(0, limit ?? 20)) {
      let name: string | null = null;
      let decodedArgs: Record<string, unknown> | null = null;

      if (abi) {
        try {
          const decoded = decodeEventLog({
            abi,
            data: log.data,
            topics: log.topics,
          });
          name = decoded.eventName ?? null;
          decodedArgs = decoded.args
            ? serializeArgs(decoded.args as unknown as Record<string, unknown>)
            : null;
        } catch {
          // 디코딩 실패 시 raw 유지
        }
      }

      events.push({
        name,
        args: decodedArgs,
        txHash: log.transactionHash ?? null,
        blockNumber: Number(log.blockNumber),
        logIndex: Number(log.logIndex),
      });
    }

    const result: ContractEventsData = {
      address,
      events,
      count: events.length,
      fromBlock: Number(fromBlock),
      toBlock: Number(toBlock),
    };

    cache.set(cacheKey, result, 30);
    return makeSuccess(chain, result, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(`Failed to fetch events: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getContractEvents",
    "컨트랙트 이벤트 로그를 조회합니다 (ABI 자동 디코딩, 최근 1000블록 기본, 블록 범위 지정 가능)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
