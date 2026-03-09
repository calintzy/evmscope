import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { fetchQuote } from "../shared/paraswap.js";
import { resolveTokenMeta } from "../shared/coingecko.js";
import { NATIVE_TOKEN_ADDRESS } from "../shared/constants.js";

interface SwapQuoteData {
  tokenIn: { symbol: string; address: string; amount: string };
  tokenOut: { symbol: string; address: string; amount: string };
  exchangeRate: number;
  priceImpact: number | null;
  source: string;
  estimatedGasUsd: string;
}

const inputSchema = z.object({
  tokenIn: z.string().describe("매도 토큰 심볼 (ETH, USDC) 또는 contract address"),
  tokenOut: z.string().describe("매수 토큰 심볼 (USDC, WETH) 또는 contract address"),
  amountIn: z.string().describe("매도 수량 (사람이 읽을 수 있는 단위, 예: '1.5')"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
});

function resolveToken(symbolOrAddress: string, chain: SupportedChain): { address: string; symbol: string; decimals: number } | null {
  const input = symbolOrAddress.trim().toUpperCase();

  // ETH/POL → ParaSwap 네이티브 토큰 주소
  if (input === "ETH" || input === "POL" || input === "MATIC") {
    return { address: NATIVE_TOKEN_ADDRESS, symbol: input, decimals: 18 };
  }

  // 주소인 경우
  if (symbolOrAddress.startsWith("0x") && symbolOrAddress.length === 42) {
    const meta = resolveTokenMeta(symbolOrAddress, chain);
    return {
      address: symbolOrAddress,
      symbol: meta?.symbol ?? "UNKNOWN",
      decimals: meta?.decimals ?? 18,
    };
  }

  // 심볼로 검색
  const meta = resolveTokenMeta(symbolOrAddress, chain);
  if (!meta) return null;
  const addresses = meta.addresses;
  const addr = addresses[chain];
  if (!addr) return null;
  return { address: addr, symbol: meta.symbol, decimals: meta.decimals };
}

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<SwapQuoteData>> {
  const { tokenIn, tokenOut, amountIn, chain } = args;

  const srcToken = resolveToken(tokenIn, chain);
  if (!srcToken) return makeError(`Token '${tokenIn}' not found on ${chain}`, "TOKEN_NOT_FOUND");

  const destToken = resolveToken(tokenOut, chain);
  if (!destToken) return makeError(`Token '${tokenOut}' not found on ${chain}`, "TOKEN_NOT_FOUND");

  // 사람이 읽을 수 있는 수량 → raw 수량 변환
  const amountRaw = BigInt(Math.floor(parseFloat(amountIn) * Math.pow(10, srcToken.decimals))).toString();

  try {
    const quote = await fetchQuote(
      srcToken.address,
      destToken.address,
      amountRaw,
      srcToken.decimals,
      destToken.decimals,
      chain,
    );

    const destAmountFormatted = (Number(BigInt(quote.destAmount)) / Math.pow(10, destToken.decimals)).toFixed(6);
    const srcAmountFormatted = (Number(BigInt(quote.srcAmount)) / Math.pow(10, srcToken.decimals)).toFixed(6);

    const exchangeRate = Number(destAmountFormatted) / Number(srcAmountFormatted);

    const data: SwapQuoteData = {
      tokenIn: {
        symbol: srcToken.symbol,
        address: srcToken.address,
        amount: srcAmountFormatted,
      },
      tokenOut: {
        symbol: destToken.symbol,
        address: destToken.address,
        amount: destAmountFormatted,
      },
      exchangeRate: Math.round(exchangeRate * 1000000) / 1000000,
      priceImpact: null,
      source: quote.bestRoute,
      estimatedGasUsd: quote.gasCostUSD,
    };

    return makeSuccess(chain, data, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(`Failed to get swap quote: ${message}`, "API_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getSwapQuote",
    "DEX 스왑 견적을 조회합니다 (ParaSwap 기반, 최적 경로, 가스비 포함, ETH→WETH 자동 치환)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
