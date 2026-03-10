import { createPublicClient, http, type PublicClient, type Chain } from "viem";
import { mainnet, polygon, arbitrum, base, optimism, avalanche, bsc } from "viem/chains";
import type { SupportedChain } from "../types.js";
import { chains } from "./chains.js";

const viemChainMap: Record<SupportedChain, Chain> = {
  ethereum: mainnet,
  polygon: polygon,
  arbitrum: arbitrum,
  base: base,
  optimism: optimism,
  avalanche: avalanche,
  bsc: bsc,
};

// 체인별 RPC URL 환경변수 매핑 (CRITICAL #1: 체인별 분리)
const RPC_ENV_KEYS: Record<SupportedChain, string> = {
  ethereum: "EVMSCOPE_RPC_URL_ETHEREUM",
  polygon: "EVMSCOPE_RPC_URL_POLYGON",
  arbitrum: "EVMSCOPE_RPC_URL_ARBITRUM",
  base: "EVMSCOPE_RPC_URL_BASE",
  optimism: "EVMSCOPE_RPC_URL_OPTIMISM",
  avalanche: "EVMSCOPE_RPC_URL_AVALANCHE",
  bsc: "EVMSCOPE_RPC_URL_BSC",
};

const clients = new Map<string, PublicClient>();

export function getClient(chain: SupportedChain = "ethereum"): PublicClient {
  if (!clients.has(chain)) {
    const config = chains[chain];
    if (!config) throw new Error(`Unsupported chain: ${chain}`);

    // 체인별 환경변수 → 공통 환경변수 → 기본값 순서
    const rpcUrl =
      process.env[RPC_ENV_KEYS[chain]] ||
      process.env.EVMSCOPE_RPC_URL ||
      config.rpcUrl;

    clients.set(
      chain,
      createPublicClient({
        chain: viemChainMap[chain],
        transport: http(rpcUrl),
      }),
    );
  }
  return clients.get(chain)!;
}

export function clearClients(): void {
  clients.clear();
}
