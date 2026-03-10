import { cache } from "./cache.js";
import { isValidSlug } from "./validate.js";

const BASE_URL = "https://api.llama.fi";
const YIELDS_BASE_URL = "https://yields.llama.fi";
const TVL_CACHE_TTL = 300; // 5분
const YIELD_CACHE_TTL = 300; // 5분

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
  if (!isValidSlug(slug)) return null;

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

// --- Yields API ---

export interface YieldPool {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number | null;
  apyBase: number | null;
  apyReward: number | null;
  stablecoin: boolean;
}

/** DefiLlama Yields API에서 DeFi 수익률 조회 (5분 캐시, 상위 10개) */
export async function getYieldPools(options?: {
  protocol?: string;
  chain?: string;
  minTvl?: number;
}): Promise<YieldPool[]> {
  const proto = options?.protocol?.toLowerCase() ?? "all";
  const ch = options?.chain?.toLowerCase() ?? "all";
  const minTvl = options?.minTvl ?? 1000000;
  const cacheKey = `yields:${proto}:${ch}:${minTvl}`;
  const cached = cache.get<YieldPool[]>(cacheKey);
  if (cached.hit) return cached.data;

  const res = await fetch(`${YIELDS_BASE_URL}/pools`);
  if (!res.ok) throw new Error(`DefiLlama Yields API error: ${res.status}`);

  const json = (await res.json()) as { status: string; data: Array<Record<string, unknown>> };
  if (json.status !== "success") throw new Error("DefiLlama Yields API error");

  let pools = json.data;

  // TVL 필터
  pools = pools.filter((p) => ((p.tvlUsd as number) ?? 0) >= minTvl);

  // 프로토콜 필터
  if (options?.protocol) {
    const filter = options.protocol.toLowerCase();
    pools = pools.filter((p) => (p.project as string)?.toLowerCase() === filter);
  }

  // 체인 필터
  if (options?.chain) {
    const filter = options.chain.toLowerCase();
    pools = pools.filter((p) => (p.chain as string)?.toLowerCase() === filter);
  }

  // APY 내림차순 정렬, 상위 10개
  pools.sort((a, b) => ((b.apy as number) ?? 0) - ((a.apy as number) ?? 0));

  const result: YieldPool[] = pools.slice(0, 10).map((p) => ({
    pool: (p.pool as string) ?? "",
    chain: (p.chain as string) ?? "",
    project: (p.project as string) ?? "",
    symbol: (p.symbol as string) ?? "",
    tvlUsd: (p.tvlUsd as number) ?? 0,
    apy: (p.apy as number) ?? null,
    apyBase: (p.apyBase as number) ?? null,
    apyReward: (p.apyReward as number) ?? null,
    stablecoin: (p.stablecoin as boolean) ?? false,
  }));

  cache.set(cacheKey, result, YIELD_CACHE_TTL);
  return result;
}
