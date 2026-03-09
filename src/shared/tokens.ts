import type { SupportedChain } from "../types.js";
import tokensData from "../data/tokens.json" with { type: "json" };

export interface TokenEntry {
  symbol: string;
  name: string;
  decimals: number;
  addresses: Record<string, string>;
  coingeckoId: string;
}

// 타입 적용 (as Record<string, string> 캐스팅 제거)
export const tokens: TokenEntry[] = tokensData as TokenEntry[];

/** 심볼 또는 주소로 토큰 주소/심볼/소수점 해석 (7개 tool의 반복 패턴 통합) */
export function resolveTokenAddress(
  symbolOrAddr: string,
  chain: SupportedChain,
): { address: string; symbol: string; decimals: number } | null {
  const input = symbolOrAddr.trim();
  const isAddr = input.startsWith("0x") && input.length === 42;

  for (const token of tokens) {
    if (isAddr) {
      for (const [tokenChain, addr] of Object.entries(token.addresses)) {
        if (addr.toLowerCase() === input.toLowerCase()) {
          if (tokenChain === chain) {
            return { address: addr, symbol: token.symbol, decimals: token.decimals };
          }
        }
      }
    } else {
      if (token.symbol.toLowerCase() === input.toLowerCase()) {
        const addr = token.addresses[chain];
        if (addr) {
          return { address: addr, symbol: token.symbol, decimals: token.decimals };
        }
        return null;
      }
    }
  }
  return null;
}
