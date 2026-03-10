import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeSuccess, makeError } from "../types.js";
import type { ToolResult } from "../types.js";
import { getYieldPools, type YieldPool } from "../shared/defillama.js";
import { sanitizeError } from "../shared/validate.js";

interface YieldRatesData {
  protocol: string | null;
  chain: string | null;
  minTvl: number;
  pools: YieldPool[];
  count: number;
}

const inputSchema = z.object({
  protocol: z.string().optional().describe("프로토콜 이름 필터 (aave-v3, compound-v3 등)"),
  chain: z.string().optional().describe("체인 필터 (Ethereum, Polygon 등)"),
  minTvl: z.number().optional().default(1000000).describe("최소 TVL (USD, 기본 $1M)"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<YieldRatesData>> {
  const { protocol, chain, minTvl } = args;

  try {
    const pools = await getYieldPools({ protocol, chain, minTvl });

    const result: YieldRatesData = {
      protocol: protocol ?? null,
      chain: chain ?? null,
      minTvl: minTvl ?? 1000000,
      pools,
      count: pools.length,
    };

    return makeSuccess("ethereum", result, false);
  } catch (err) {
    const message = sanitizeError(err);
    return makeError(`Failed to fetch yield rates: ${message}`, "API_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getYieldRates",
    "DeFi 수익률(APY)을 조회합니다 (DefiLlama 기반, 프로토콜/체인별 필터, TVL 기준 상위 10개 풀)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
