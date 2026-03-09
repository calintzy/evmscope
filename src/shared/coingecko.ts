import { cache } from "./cache.js";
import { tokens as tokensData } from "./tokens.js";

const BASE_URL = "https://api.coingecko.com/api/v3";
const PRICE_CACHE_TTL = 30;

interface CoinGeckoPriceResponse {
  [id: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
  };
}

export interface PriceData {
  priceUsd: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

export function resolveCoingeckoId(symbolOrAddress: string, chain?: string): string | null {
  const input = symbolOrAddress.trim();
  const isAddress = input.startsWith("0x") && input.length === 42;

  for (const token of tokensData) {
    if (isAddress) {
      for (const [tokenChain, addr] of Object.entries(token.addresses)) {
        if (addr.toLowerCase() === input.toLowerCase()) {
          if (!chain || tokenChain === chain) return token.coingeckoId;
        }
      }
    } else {
      if (token.symbol.toLowerCase() === input.toLowerCase()) {
        return token.coingeckoId;
      }
    }
  }
  return null;
}

export function resolveTokenMeta(symbolOrAddress: string, chain?: string) {
  const input = symbolOrAddress.trim();
  const isAddress = input.startsWith("0x") && input.length === 42;

  for (const token of tokensData) {
    if (isAddress) {
      for (const [tokenChain, addr] of Object.entries(token.addresses)) {
        if (addr.toLowerCase() === input.toLowerCase()) {
          if (!chain || tokenChain === chain) return token;
        }
      }
    } else {
      if (token.symbol.toLowerCase() === input.toLowerCase()) {
        return token;
      }
    }
  }
  return null;
}

export async function getPrice(coingeckoId: string): Promise<PriceData> {
  const cacheKey = `price:${coingeckoId}`;
  const cached = cache.get<PriceData>(cacheKey);
  if (cached.hit) return cached.data;

  const apiKey = process.env.EVMSCOPE_COINGECKO_KEY;
  const headers: Record<string, string> = {};
  if (apiKey) headers["x-cg-demo-api-key"] = apiKey;

  const url = `${BASE_URL}/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;

  const res = await fetch(url, { headers });

  if (res.status === 429) {
    const stale = cache.getStale<PriceData>(cacheKey);
    if (stale) return stale;
    throw new Error("RATE_LIMITED");
  }

  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);

  const json = (await res.json()) as CoinGeckoPriceResponse;
  const data = json[coingeckoId];
  if (!data) throw new Error(`No price data for ${coingeckoId}`);

  const result: PriceData = {
    priceUsd: data.usd,
    change24h: data.usd_24h_change ?? 0,
    marketCap: data.usd_market_cap ?? 0,
    volume24h: data.usd_24h_vol ?? 0,
  };

  cache.set(cacheKey, result, PRICE_CACHE_TTL);
  return result;
}
