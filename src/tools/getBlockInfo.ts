import { z } from "zod";
import { formatGwei } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";
import { sanitizeError } from "../shared/validate.js";

// 블록 정보 응답 타입
interface BlockInfoData {
  chain: SupportedChain;
  blockNumber: number;
  timestamp: number;
  datetime: string;
  hash: string;
  parentHash: string;
  gasUsed: string;
  gasLimit: string;
  baseFeePerGas: string | null;
  transactionCount: number;
  miner: string;
}

// 캐시 TTL (초)
const LATEST_BLOCK_TTL = 60;
const CONFIRMED_BLOCK_TTL = 3600;

const inputSchema = z.object({
  blockNumber: z
    .string()
    .default("latest")
    .describe("블록 번호 또는 'latest'"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<BlockInfoData>> {
  const { blockNumber, chain } = args;

  // "latest"가 아닌 경우 숫자 검증
  const isLatest = blockNumber === "latest";
  let blockNum: bigint | undefined;
  if (!isLatest) {
    const parsed = Number(blockNumber);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return makeError(`Invalid block number: ${blockNumber}`, "INVALID_INPUT");
    }
    blockNum = BigInt(parsed);
  }

  // 특정 블록 번호인 경우 캐시 확인
  const cacheKey = `block:${chain}:${blockNumber}`;
  const cached = cache.get<BlockInfoData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  try {
    const client = getClient(chain);

    const block = isLatest
      ? await client.getBlock({ blockTag: "latest" })
      : await client.getBlock({ blockNumber: blockNum });

    const data: BlockInfoData = {
      chain,
      blockNumber: Number(block.number),
      timestamp: Number(block.timestamp),
      datetime: new Date(Number(block.timestamp) * 1000).toISOString(),
      hash: block.hash ?? "",
      parentHash: block.parentHash,
      gasUsed: block.gasUsed.toString(),
      gasLimit: block.gasLimit.toString(),
      baseFeePerGas: block.baseFeePerGas != null ? formatGwei(block.baseFeePerGas) : null,
      transactionCount: block.transactions.length,
      miner: block.miner ?? "",
    };

    // latest 요청은 짧은 TTL, 특정 블록은 긴 TTL
    const ttl = isLatest ? LATEST_BLOCK_TTL : CONFIRMED_BLOCK_TTL;
    cache.set(cacheKey, data, ttl);

    return makeSuccess(chain, data, false);
  } catch (err) {
    const message = sanitizeError(err);
    return makeError(`Failed to fetch block info: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getBlockInfo",
    "블록 번호 또는 'latest'로 블록 상세 정보(타임스탬프, 트랜잭션 수, gas 사용량, 검증자)를 조회합니다",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
