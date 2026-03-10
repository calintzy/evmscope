import { cache } from "./cache.js";
import { logCatchError } from "./logger.js";
import { sanitizeError } from "./validate.js";

const BASE_URL = "https://api.ethplorer.io";
const HOLDER_CACHE_TTL = 600; // 10분

export interface EthplorerHolder {
  address: string;
  balance: number;
  share: number;
}

export interface TokenHoldersResult {
  holders: EthplorerHolder[];
  totalHolders: number;
}

/** Ethplorer에서 토큰 상위 홀더 조회 (Ethereum만, freekey 사용 가능) */
export async function getTopTokenHolders(
  tokenAddress: string,
  limit: number = 10,
): Promise<TokenHoldersResult | null> {
  const cacheKey = `ethplorer:holders:${tokenAddress.toLowerCase()}:${limit}`;
  const cached = cache.get<TokenHoldersResult>(cacheKey);
  if (cached.hit) return cached.data;

  const apiKey = process.env.EVMSCOPE_ETHPLORER_KEY || "freekey";

  try {
    const res = await fetch(
      `${BASE_URL}/getTopTokenHolders/${tokenAddress}?apiKey=${apiKey}&limit=${limit}`,
    );
    if (!res.ok) return null;

    const json = (await res.json()) as {
      holders?: Array<{ address: string; balance: number; share: number }>;
    };
    if (!json.holders) return null;

    // 전체 홀더 수 조회
    let totalHolders = json.holders.length;
    try {
      const infoRes = await fetch(
        `${BASE_URL}/getTokenInfo/${tokenAddress}?apiKey=${apiKey}`,
      );
      if (infoRes.ok) {
        const info = (await infoRes.json()) as { holdersCount?: number };
        if (info.holdersCount) totalHolders = info.holdersCount;
      }
    } catch (err) {
      logCatchError("ethplorer:tokenInfo", err);
    }

    const result: TokenHoldersResult = {
      holders: json.holders.map((h) => ({
        address: h.address,
        balance: h.balance,
        share: h.share,
      })),
      totalHolders,
    };

    cache.set(cacheKey, result, HOLDER_CACHE_TTL);
    return result;
  } catch (err) {
    logCatchError("ethplorer", sanitizeError(err));
    return null;
  }
}
