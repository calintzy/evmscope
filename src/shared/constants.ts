import type { SupportedChain } from "../types.js";

// 체인별 ID 매핑 (etherscan, honeypot, lifi, paraswap 중복 제거)
export const CHAIN_IDS: Record<SupportedChain, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
  optimism: 10,
  avalanche: 43114,
  bsc: 56,
};

// ParaSwap/LI.FI 네이티브 토큰 주소 (cli, getBridgeRoutes, getSwapQuote 중복 제거)
export const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// 버전 (빌드 시 tsup define으로 package.json에서 자동 주입)
declare const __VERSION__: string;
export const VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "1.6.0";
