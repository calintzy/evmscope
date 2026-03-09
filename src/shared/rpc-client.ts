import { createPublicClient, http, type PublicClient, type Chain } from "viem";
import { mainnet, polygon, arbitrum, base, optimism } from "viem/chains";
import type { SupportedChain } from "../types.js";
import chainsData from "../data/chains.json" with { type: "json" };

const viemChainMap: Record<SupportedChain, Chain> = {
  ethereum: mainnet,
  polygon: polygon,
  arbitrum: arbitrum,
  base: base,
  optimism: optimism,
};

const clients = new Map<string, PublicClient>();

export function getClient(chain: SupportedChain = "ethereum"): PublicClient {
  if (!clients.has(chain)) {
    const config = chainsData[chain];
    if (!config) throw new Error(`Unsupported chain: ${chain}`);

    const rpcUrl = process.env.EVMSCOPE_RPC_URL || config.rpcUrl;

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
