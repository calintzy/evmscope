import { z } from "zod";
import { formatGwei } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";
import { getPrice } from "../shared/coingecko.js";
import { getNativeCoingeckoId } from "../shared/chains.js";

interface ChainGas {
  chain: SupportedChain;
  baseFeeGwei: string;
  estimatedCostUsd: number;
}

interface CompareGasData {
  chains: ChainGas[];
  cheapest: SupportedChain;
  mostExpensive: SupportedChain;
}

const CACHE_TTL = 15;
const STANDARD_GAS = 21000n;

const inputSchema = z.object({});

async function fetchChainGas(chain: SupportedChain): Promise<ChainGas> {
  const client = getClient(chain);
  const block = await client.getBlock({ blockTag: "latest" });
  const baseFee = block.baseFeePerGas ?? 0n;

  let nativePriceUsd = 0;
  try {
    const nativeId = getNativeCoingeckoId(chain);
    if (nativeId) {
      const priceData = await getPrice(nativeId);
      nativePriceUsd = priceData.priceUsd;
    }
  } catch {
    // 가격 조회 실패 시 0
  }

  let costUsd = 0;
  if (nativePriceUsd > 0) {
    const costWei = baseFee * STANDARD_GAS;
    const costEth = Number(costWei) / 1e18;
    costUsd = Math.round(costEth * nativePriceUsd * 10000) / 10000;
  }

  return {
    chain,
    baseFeeGwei: formatGwei(baseFee),
    estimatedCostUsd: costUsd,
  };
}

async function handler(_args: z.infer<typeof inputSchema>): Promise<ToolResult<CompareGasData>> {
  const cacheKey = "comparegas:all";
  const cached = cache.get<CompareGasData>(cacheKey);
  if (cached.hit) return makeSuccess("ethereum", cached.data, true);

  try {
    const results = await Promise.allSettled(
      SUPPORTED_CHAINS.map((chain) => fetchChainGas(chain)),
    );

    const chains: ChainGas[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        chains.push(result.value);
      }
    }

    if (chains.length === 0) {
      return makeError("Failed to fetch gas from any chain", "RPC_ERROR");
    }

    // 비용 오름차순 정렬
    chains.sort((a, b) => a.estimatedCostUsd - b.estimatedCostUsd);

    const data: CompareGasData = {
      chains,
      cheapest: chains[0].chain,
      mostExpensive: chains[chains.length - 1].chain,
    };

    cache.set(cacheKey, data, CACHE_TTL);
    return makeSuccess("ethereum", data, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(`Failed to compare gas: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "compareGas",
    "5개 EVM 체인의 가스비를 한 번에 비교합니다 (최저가 순 정렬, USD 예상 비용 포함)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
