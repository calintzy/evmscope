import type { SupportedChain, ChainConfig } from "../types.js";
import chainsData from "../data/chains.json" with { type: "json" };

// 타입 적용 re-export (as Record 캐스팅 제거)
export const chains: Record<SupportedChain, ChainConfig> = chainsData as Record<SupportedChain, ChainConfig>;

/** 체인의 네이티브 토큰 coingeckoId 조회 */
export function getNativeCoingeckoId(chain: SupportedChain): string | undefined {
  return chains[chain]?.nativeCurrency?.coingeckoId;
}
