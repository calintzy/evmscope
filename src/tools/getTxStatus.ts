import { z } from "zod";
import { formatEther, formatGwei } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeSuccess, makeError, isSupportedChain } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";

interface TxStatusData {
  hash: string;
  status: "pending" | "success" | "failed";
  blockNumber: number | null;
  confirmations: number;
  from: string;
  to: string | null;
  value: string;
  gasUsed: string | null;
  effectiveGasPrice: string | null;
  nonce: number;
  timestamp: number | null;
}

const TX_CACHE_TTL = 60; // 확정된 tx는 1분 캐시

const inputSchema = z.object({
  txHash: z.string().describe("트랜잭션 해시 (0x...)"),
  chain: z.string().default("ethereum").describe("체인 (ethereum, polygon, arbitrum, base, optimism)"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<TxStatusData>> {
  const { txHash, chain } = args;

  if (!isSupportedChain(chain)) {
    return makeError(`Unsupported chain: ${chain}`, "CHAIN_NOT_SUPPORTED");
  }

  if (!txHash.startsWith("0x") || txHash.length !== 66) {
    return makeError(`Invalid transaction hash: ${txHash}`, "INVALID_INPUT");
  }

  const cacheKey = `txstatus:${chain}:${txHash.toLowerCase()}`;
  const cached = cache.get<TxStatusData>(cacheKey);
  if (cached.hit) return makeSuccess(chain as SupportedChain, cached.data, true);

  const client = getClient(chain as SupportedChain);

  try {
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` });

    let status: "pending" | "success" | "failed" = "pending";
    let gasUsed: string | null = null;
    let effectiveGasPrice: string | null = null;
    let confirmations = 0;
    let timestamp: number | null = null;

    if (tx.blockNumber) {
      // 확정된 트랜잭션 — receipt 조회
      try {
        const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
        status = receipt.status === "success" ? "success" : "failed";
        gasUsed = receipt.gasUsed.toString();
        effectiveGasPrice = formatGwei(receipt.effectiveGasPrice);
      } catch {
        // receipt 조회 실패 시 status 불명
        status = "success"; // 블록에 포함되었으면 일단 success로 간주
      }

      // confirmations 계산
      try {
        const currentBlock = await client.getBlockNumber();
        confirmations = Number(currentBlock - tx.blockNumber);
      } catch {
        // 무시
      }

      // 타임스탬프 조회
      try {
        const block = await client.getBlock({ blockNumber: tx.blockNumber });
        timestamp = Number(block.timestamp);
      } catch {
        // 무시
      }
    }

    const data: TxStatusData = {
      hash: tx.hash,
      status,
      blockNumber: tx.blockNumber ? Number(tx.blockNumber) : null,
      confirmations,
      from: tx.from,
      to: tx.to,
      value: formatEther(tx.value),
      gasUsed,
      effectiveGasPrice,
      nonce: tx.nonce,
      timestamp,
    };

    // pending이 아닌 경우에만 캐시
    if (status !== "pending") {
      cache.set(cacheKey, data, TX_CACHE_TTL);
    }

    return makeSuccess(chain as SupportedChain, data, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found") || message.includes("could not be found")) {
      return makeError(`Transaction not found: ${txHash}`, "TX_NOT_FOUND");
    }
    return makeError(`Failed to get transaction: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getTxStatus",
    "트랜잭션 상태를 조회합니다 (pending/success/failed, confirmations, gas 사용량)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
