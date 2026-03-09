import { cache } from "./cache.js";

const BASE_URL = "https://api.llama.fi";
const TVL_CACHE_TTL = 300; // 5분

export interface DefiLlamaProtocol {
  name: string;
  slug: string;
  tvl: number;
  chainTvls: Record<string, number>;
  change_1d: number | null;
  change_7d: number | null;
}

interface DefiLlamaResponse {
  name: string;
  slug: string;
  tvl: Array<{ date: number; totalLiquidityUSD: number }>;
  currentChainTvls: Record<string, number>;
}

/** DefiLlama에서 프로토콜 데이터 조회 (5분 캐시) */
export async function getProtocolData(slug: string): Promise<DefiLlamaProtocol | null> {
  const cacheKey = `defillama:${slug}`;
  const cached = cache.get<DefiLlamaProtocol>(cacheKey);
  if (cached.hit) return cached.data;

  try {
    const res = await fetch(`${BASE_URL}/protocol/${slug}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`DefiLlama API error: ${res.status}`);
    }

    const json = (await res.json()) as DefiLlamaResponse;

    // 현재 TVL
    const tvlArray = json.tvl;
    const currentTvl = tvlArray.length > 0 ? tvlArray[tvlArray.length - 1].totalLiquidityUSD : 0;

    // 24h, 7d 변동률 계산
    let change1d: number | null = null;
    let change7d: number | null = null;

    if (tvlArray.length >= 2) {
      const prev = tvlArray[tvlArray.length - 2].totalLiquidityUSD;
      if (prev > 0) change1d = ((currentTvl - prev) / prev) * 100;
    }
    if (tvlArray.length >= 8) {
      const prev7d = tvlArray[tvlArray.length - 8].totalLiquidityUSD;
      if (prev7d > 0) change7d = ((currentTvl - prev7d) / prev7d) * 100;
    }

    const result: DefiLlamaProtocol = {
      name: json.name,
      slug,
      tvl: currentTvl,
      chainTvls: json.currentChainTvls ?? {},
      change_1d: change1d !== null ? Math.round(change1d * 100) / 100 : null,
      change_7d: change7d !== null ? Math.round(change7d * 100) / 100 : null,
    };

    cache.set(cacheKey, result, TVL_CACHE_TTL);
    return result;
  } catch (err) {
    if (err instanceof Error && err.message.includes("404")) return null;
    throw err;
  }
}
