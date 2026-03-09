import type { SupportedChain } from "../types.js";

// 체인별 ID 매핑 (etherscan, honeypot, lifi, paraswap 중복 제거)
export const CHAIN_IDS: Record<SupportedChain, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
  optimism: 10,
};

// ParaSwap/LI.FI 네이티브 토큰 주소 (cli, getBridgeRoutes, getSwapQuote 중복 제거)
export const NATIVE_TOKEN_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

// 버전 (package.json에서 가져오기)
export const VERSION = "1.5.1";
