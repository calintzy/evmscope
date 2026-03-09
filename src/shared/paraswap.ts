import { cache } from "./cache.js";
import type { SupportedChain } from "../types.js";
import { CHAIN_IDS } from "./constants.js";
import { sanitizeError } from "./validate.js";

const PARASWAP_BASE = "https://apiv5.paraswap.io";
const QUOTE_CACHE_TTL = 15;

export interface ParaswapQuote {
  srcToken: string;
  srcDecimals: number;
  srcAmount: string;
  destToken: string;
  destDecimals: number;
  destAmount: string;
  bestRoute: string;
  gasCostUSD: string;
}

interface PriceRouteResponse {
  priceRoute: {
    srcToken: string;
    srcDecimals: number;
    srcAmount: string;
    destToken: string;
    destDecimals: number;
    destAmount: string;
    bestRoute: Array<{
      swaps: Array<{
        swapExchanges: Array<{ exchange: string }>;
      }>;
    }>;
    gasCost: string;
    gasCostUSD?: string;
  };
}

/** ParaSwap에서 스왑 견적 조회 (15초 캐시) */
export async function fetchQuote(
  srcToken: string,
  destToken: string,
  amount: string,
  srcDecimals: number,
  destDecimals: number,
  chain: SupportedChain,
): Promise<ParaswapQuote> {
  const chainId = CHAIN_IDS[chain];
  const cacheKey = `paraswap:${chain}:${srcToken.toLowerCase()}:${destToken.toLowerCase()}:${amount}`;
  const cached = cache.get<ParaswapQuote>(cacheKey);
  if (cached.hit) return cached.data;

  const params = new URLSearchParams({
    srcToken,
    destToken,
    amount,
    srcDecimals: String(srcDecimals),
    destDecimals: String(destDecimals),
    side: "SELL",
    network: String(chainId),
  });

  const res = await fetch(`${PARASWAP_BASE}/prices?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`ParaSwap API error: ${res.status}`);
  }

  const json = (await res.json()) as PriceRouteResponse;
  const route = json.priceRoute;

  // 최적 경로의 exchange 이름 추출
  let bestExchange = "unknown";
  if (route.bestRoute?.[0]?.swaps?.[0]?.swapExchanges?.[0]) {
    bestExchange = route.bestRoute[0].swaps[0].swapExchanges[0].exchange;
  }

  const result: ParaswapQuote = {
    srcToken: route.srcToken,
    srcDecimals: route.srcDecimals,
    srcAmount: route.srcAmount,
    destToken: route.destToken,
    destDecimals: route.destDecimals,
    destAmount: route.destAmount,
    bestRoute: bestExchange,
    gasCostUSD: route.gasCostUSD ?? route.gasCost,
  };

  cache.set(cacheKey, result, QUOTE_CACHE_TTL);
  return result;
}
