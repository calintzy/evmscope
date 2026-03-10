import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { cache } from "../shared/cache.js";
import { sanitizeError } from "../shared/validate.js";
import { EXPLORER_API_URLS, getApiKey } from "../shared/etherscan.js";

// 토큰 전송 내역 개별 항목
interface TokenTransferItem {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  timestamp: string;
  direction: "in" | "out";
}

// 도구 응답 데이터
interface TokenTransfersData {
  address: string;
  chain: string;
  transfers: TokenTransferItem[];
  count: number;
}

// Etherscan API 응답 항목
interface EtherscanTokenTx {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  timeStamp: string;
}

const CACHE_TTL = 120; // 2분

const inputSchema = z.object({
  address: z.string().describe("지갑 주소 (0x...)"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
  limit: z.number().optional().default(20).describe("조회할 전송 수 (기본 20, 최대 100)"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<TokenTransfersData>> {
  const { address, chain } = args;
  const limit = Math.min(args.limit ?? 20, 100);

  const baseUrl = EXPLORER_API_URLS[chain];
  if (!baseUrl) return makeError(`Chain '${chain}' not supported`, "CHAIN_NOT_SUPPORTED");

  const cacheKey = `wallet-tokentx:${chain}:${address.toLowerCase()}:${limit}`;
  const cached = cache.get<TokenTransfersData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  const apiKey = getApiKey(chain);
  const params = new URLSearchParams({
    module: "account",
    action: "tokentx",
    address,
    page: "1",
    offset: String(limit),
    sort: "desc",
    ...(apiKey ? { apikey: apiKey } : {}),
  });

  try {
    const res = await fetch(`${baseUrl}?${params}`);
    if (!res.ok) return makeError(`Etherscan API error: ${res.status}`, "API_ERROR");

    const json = (await res.json()) as { status: string; result: EtherscanTokenTx[] };
    if (json.status !== "1" || !Array.isArray(json.result)) {
      return makeError("No token transfer data available", "API_ERROR");
    }

    const lowerAddress = address.toLowerCase();

    // 전송 내역 변환
    const transfers: TokenTransferItem[] = json.result.map((tx) => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      tokenName: tx.tokenName,
      tokenSymbol: tx.tokenSymbol,
      tokenDecimal: tx.tokenDecimal,
      timestamp: tx.timeStamp,
      direction: tx.from.toLowerCase() === lowerAddress ? "out" : "in",
    }));

    const data: TokenTransfersData = {
      address,
      chain,
      transfers,
      count: transfers.length,
    };

    cache.set(cacheKey, data, CACHE_TTL);
    return makeSuccess(chain, data, false);
  } catch (err) {
    const message = sanitizeError(err);
    return makeError(`Failed to fetch token transfers: ${message}`, "API_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getTokenTransfers",
    "지갑 주소의 최근 ERC-20 토큰 전송 내역(입금/출금, 토큰명, 수량)을 조회합니다",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
