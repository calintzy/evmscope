import { z } from "zod";
import { formatGwei } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";
import { getPrice, resolveCoingeckoId } from "../shared/coingecko.js";
import { getNativeCoingeckoId } from "../shared/chains.js";
import { sanitizeError } from "../shared/validate.js";

interface GasEstimate {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  estimatedCostUsd: number;
}

interface GasPriceData {
  slow: GasEstimate;
  normal: GasEstimate;
  fast: GasEstimate;
  baseFee: string;
  lastBlock: number;
}

const GAS_CACHE_TTL = 15;
const STANDARD_GAS = 21000n;

const inputSchema = z.object({
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<GasPriceData>> {
  const { chain } = args;

  const cacheKey = `gas:${chain}`;
  const cached = cache.get<GasPriceData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  try {
    const client = getClient(chain);

    const [block, maxPriorityFee] = await Promise.all([
      client.getBlock({ blockTag: "latest" }),
      client.estimateMaxPriorityFeePerGas(),
    ]);

    const baseFee = block.baseFeePerGas ?? 0n;

    const prioritySlow = maxPriorityFee * 80n / 100n;
    const priorityNormal = maxPriorityFee;
    const priorityFast = maxPriorityFee * 150n / 100n;

    const maxFeeSlow = baseFee + prioritySlow;
    const maxFeeNormal = baseFee + priorityNormal;
    const maxFeeFast = baseFee + priorityFast;

    let ethPriceUsd = 0;
    try {
      const nativeCoingeckoId = getNativeCoingeckoId(chain);
      if (nativeCoingeckoId) {
        const priceData = await getPrice(nativeCoingeckoId);
        ethPriceUsd = priceData.priceUsd;
      }
    } catch {
      // 가격 조회 실패해도 가스비 자체는 반환
    }

    function calcCostUsd(maxFeeGwei: bigint): number {
      if (ethPriceUsd === 0) return 0;
      const costWei = maxFeeGwei * STANDARD_GAS;
      const costEth = Number(costWei) / 1e18;
      return Math.round(costEth * ethPriceUsd * 10000) / 10000;
    }

    const data: GasPriceData = {
      slow: {
        maxFeePerGas: formatGwei(maxFeeSlow),
        maxPriorityFeePerGas: formatGwei(prioritySlow),
        estimatedCostUsd: calcCostUsd(maxFeeSlow),
      },
      normal: {
        maxFeePerGas: formatGwei(maxFeeNormal),
        maxPriorityFeePerGas: formatGwei(priorityNormal),
        estimatedCostUsd: calcCostUsd(maxFeeNormal),
      },
      fast: {
        maxFeePerGas: formatGwei(maxFeeFast),
        maxPriorityFeePerGas: formatGwei(priorityFast),
        estimatedCostUsd: calcCostUsd(maxFeeFast),
      },
      baseFee: formatGwei(baseFee),
      lastBlock: Number(block.number),
    };

    cache.set(cacheKey, data, GAS_CACHE_TTL);
    return makeSuccess(chain, data, false);
  } catch (err) {
    const message = sanitizeError(err);
    return makeError(`Failed to fetch gas price: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getGasPrice",
    "현재 가스비를 slow/normal/fast 3단계로 조회합니다 (Gwei + USD 예상 비용)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
