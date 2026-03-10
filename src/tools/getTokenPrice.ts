import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getPrice, resolveCoingeckoId, resolveTokenMeta } from "../shared/coingecko.js";
import { sanitizeError } from "../shared/validate.js";

interface TokenPriceData {
  symbol: string;
  name: string;
  priceUsd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

const inputSchema = z.object({
  token: z.string().describe("토큰 심볼 (ETH, USDC) 또는 contract address"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<TokenPriceData>> {
  const { token, chain } = args;

  const coingeckoId = resolveCoingeckoId(token, chain);
  if (!coingeckoId) {
    return makeError(`Token '${token}' not found on ${chain}`, "TOKEN_NOT_FOUND");
  }

  const meta = resolveTokenMeta(token, chain);

  try {
    const price = await getPrice(coingeckoId);
    return makeSuccess(chain, {
      symbol: meta?.symbol ?? token.toUpperCase(),
      name: meta?.name ?? coingeckoId,
      priceUsd: price.priceUsd,
      change24h: price.change24h,
      marketCap: price.marketCap,
      volume24h: price.volume24h,
    }, false);
  } catch (err) {
    const message = sanitizeError(err);
    if (message === "RATE_LIMITED") {
      return makeError("CoinGecko rate limit exceeded. Try again in 30 seconds.", "RATE_LIMITED");
    }
    return makeError(`Failed to fetch price: ${message}`, "API_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getTokenPrice",
    "토큰의 현재 가격(USD)과 24시간 변동률, 시가총액, 거래량을 조회합니다",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
