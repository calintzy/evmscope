import { cache } from "./cache.js";

const BASE_URL = "https://li.quest/v1";
const BRIDGE_CACHE_TTL = 60; // 1분

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
  optimism: 10,
};

export interface BridgeRoute {
  bridge: string;
  estimatedTime: number;
  feeUsd: number;
  gasCostUsd: number;
  amountOut: string;
  amountOutUsd: number;
}

export interface BridgeRoutesResult {
  routes: BridgeRoute[];
}

/** LI.FI API로 크로스체인 브릿지 경로 조회 */
export async function fetchBridgeRoutes(
  fromChain: string,
  toChain: string,
  fromToken: string,
  toToken: string,
  amount: string,
): Promise<BridgeRoutesResult | null> {
  const fromChainId = CHAIN_IDS[fromChain];
  const toChainId = CHAIN_IDS[toChain];
  if (!fromChainId || !toChainId) return null;

  const cacheKey = `lifi:${fromChain}:${toChain}:${fromToken}:${amount}`;
  const cached = cache.get<BridgeRoutesResult>(cacheKey);
  if (cached.hit) return cached.data;

  try {
    const apiKey = process.env.EVMSCOPE_LIFI_KEY;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["x-lifi-api-key"] = apiKey;

    const body = {
      fromChainId,
      toChainId,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      fromAmount: amount,
      options: {
        slippage: 0.03,
        order: "RECOMMENDED",
      },
    };

    const res = await fetch(`${BASE_URL}/routes`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      routes?: Array<{
        id: string;
        steps: Array<{
          toolDetails: { name: string };
          estimate: {
            executionDuration: number;
            feeCosts?: Array<{ amountUSD: string }>;
            gasCosts?: Array<{ amountUSD: string }>;
            toAmount: string;
            toAmountUSD: string;
          };
        }>;
      }>;
    };

    if (!json.routes || json.routes.length === 0) return null;

    const routes: BridgeRoute[] = json.routes.map((route) => {
      const step = route.steps[0];
      const estimate = step?.estimate;
      const feeCosts = estimate?.feeCosts ?? [];
      const gasCosts = estimate?.gasCosts ?? [];
      const totalFee = feeCosts.reduce((sum, f) => sum + parseFloat(f.amountUSD || "0"), 0);
      const totalGas = gasCosts.reduce((sum, g) => sum + parseFloat(g.amountUSD || "0"), 0);

      return {
        bridge: step?.toolDetails?.name ?? "unknown",
        estimatedTime: estimate?.executionDuration ?? 0,
        feeUsd: Math.round(totalFee * 100) / 100,
        gasCostUsd: Math.round(totalGas * 100) / 100,
        amountOut: estimate?.toAmount ?? "0",
        amountOutUsd: parseFloat(estimate?.toAmountUSD ?? "0"),
      };
    });

    // 최적 경로순 정렬 (수령액 내림차순)
    routes.sort((a, b) => b.amountOutUsd - a.amountOutUsd);

    const result: BridgeRoutesResult = { routes };
    cache.set(cacheKey, result, BRIDGE_CACHE_TTL);
    return result;
  } catch {
    return null;
  }
}
