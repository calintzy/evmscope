import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { fetchBridgeRoutes } from "../shared/lifi.js";
import { resolveTokenMeta } from "../shared/coingecko.js";

interface RouteInfo {
  bridge: string;
  estimatedTime: number;
  feeUsd: number;
  gasCostUsd: number;
  amountOut: string;
  amountOutUsd: number;
}

interface BridgeRoutesData {
  fromChain: string;
  toChain: string;
  token: string;
  amount: string;
  routes: RouteInfo[];
  bestRoute: RouteInfo | null;
}

const inputSchema = z.object({
  fromChain: z.enum(SUPPORTED_CHAINS).describe("출발 체인"),
  toChain: z.enum(SUPPORTED_CHAINS).describe("도착 체인"),
  token: z.string().describe("토큰 심볼 (USDC, ETH 등) 또는 컨트랙트 주소"),
  amount: z.string().describe("전송 수량 (사람이 읽을 수 있는 단위, 예: '100')"),
});

const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<BridgeRoutesData>> {
  const { fromChain, toChain, token, amount } = args;

  if (fromChain === toChain) {
    return makeError("Source and destination chains must be different", "INVALID_INPUT");
  }

  // 토큰 주소 해석
  let fromTokenAddress: string;
  let toTokenAddress: string;
  let decimals = 18;

  const upper = token.trim().toUpperCase();
  if (upper === "ETH" || upper === "POL" || upper === "MATIC") {
    fromTokenAddress = ETH_ADDRESS;
    toTokenAddress = ETH_ADDRESS;
  } else if (token.startsWith("0x") && token.length === 42) {
    fromTokenAddress = token;
    toTokenAddress = token;
    const meta = resolveTokenMeta(token, fromChain);
    if (meta) decimals = meta.decimals;
  } else {
    const meta = resolveTokenMeta(token, fromChain);
    if (!meta) return makeError(`Token '${token}' not found`, "TOKEN_NOT_FOUND");
    decimals = meta.decimals;
    const addresses = meta.addresses as Record<string, string>;
    fromTokenAddress = addresses[fromChain];
    toTokenAddress = addresses[toChain];
    if (!fromTokenAddress) return makeError(`Token '${token}' not available on ${fromChain}`, "TOKEN_NOT_FOUND");
    if (!toTokenAddress) return makeError(`Token '${token}' not available on ${toChain}`, "TOKEN_NOT_FOUND");
  }

  // 수량 변환 (사람 → raw)
  const rawAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals))).toString();

  try {
    const result = await fetchBridgeRoutes(fromChain, toChain, fromTokenAddress, toTokenAddress, rawAmount);
    if (!result || result.routes.length === 0) {
      return makeError("No bridge routes found", "API_ERROR");
    }

    const routes: RouteInfo[] = result.routes.map((r) => ({
      bridge: r.bridge,
      estimatedTime: r.estimatedTime,
      feeUsd: r.feeUsd,
      gasCostUsd: r.gasCostUsd,
      amountOut: (Number(BigInt(r.amountOut)) / Math.pow(10, decimals)).toFixed(6),
      amountOutUsd: r.amountOutUsd,
    }));

    const data: BridgeRoutesData = {
      fromChain,
      toChain,
      token,
      amount,
      routes,
      bestRoute: routes[0] ?? null,
    };

    return makeSuccess(fromChain as SupportedChain, data, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(`Failed to fetch bridge routes: ${message}`, "API_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getBridgeRoutes",
    "크로스체인 브릿지 경로를 조회합니다 (LI.FI 기반, 비용/시간/경로 비교, 최적 경로 추천)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
