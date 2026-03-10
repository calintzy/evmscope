import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeSuccess, makeError } from "../types.js";
import type { ToolResult } from "../types.js";
import { getProtocolData } from "../shared/defillama.js";
import protocolsData from "../data/protocols.json" with { type: "json" };
import { sanitizeError } from "../shared/validate.js";

interface ChainTvl {
  chain: string;
  tvlUsd: number;
  percentage: number;
}

interface ProtocolTVLData {
  protocol: string;
  slug: string;
  totalTvlUsd: number;
  change24h: number | null;
  change7d: number | null;
  chainBreakdown: ChainTvl[];
}

const inputSchema = z.object({
  protocol: z.string().describe("프로토콜 이름 (Aave, Uniswap 등) 또는 DefiLlama slug"),
});

function resolveSlug(input: string): string | null {
  const lower = input.toLowerCase().trim();

  // protocols.json에서 defillamaSlug 검색
  for (const p of protocolsData as Array<{ name: string; defillamaSlug?: string }>) {
    if (p.defillamaSlug && (
      p.name.toLowerCase() === lower ||
      p.defillamaSlug.toLowerCase() === lower
    )) {
      return p.defillamaSlug;
    }
  }

  // 입력값을 slug로 직접 사용 시도
  return lower.replace(/\s+/g, "-");
}

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<ProtocolTVLData>> {
  const { protocol } = args;

  const slug = resolveSlug(protocol);
  if (!slug) {
    return makeError(`Protocol '${protocol}' not found`, "PROTOCOL_NOT_FOUND");
  }

  try {
    const data = await getProtocolData(slug);
    if (!data) {
      return makeError(`Protocol '${slug}' not found on DefiLlama`, "PROTOCOL_NOT_FOUND");
    }

    // 체인별 TVL 분포
    const chainBreakdown: ChainTvl[] = [];
    const totalTvl = data.tvl || 0;
    for (const [chain, tvl] of Object.entries(data.chainTvls)) {
      // staking, borrowed 등 비-체인 카테고리 제외
      if (chain.includes("-") || chain === "staking" || chain === "borrowed" || chain === "pool2" || chain === "vesting") continue;
      chainBreakdown.push({
        chain,
        tvlUsd: tvl,
        percentage: totalTvl > 0 ? Math.round((tvl / totalTvl) * 10000) / 100 : 0,
      });
    }

    // TVL 내림차순 정렬
    chainBreakdown.sort((a, b) => b.tvlUsd - a.tvlUsd);

    const result: ProtocolTVLData = {
      protocol: data.name,
      slug: data.slug,
      totalTvlUsd: totalTvl,
      change24h: data.change_1d,
      change7d: data.change_7d,
      chainBreakdown,
    };

    return makeSuccess("ethereum", result, false);
  } catch (err) {
    const message = sanitizeError(err);
    return makeError(`Failed to fetch TVL: ${message}`, "API_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getProtocolTVL",
    "DeFi 프로토콜의 TVL(Total Value Locked)을 조회합니다 (DefiLlama 기반, 체인별 분포, 24h/7d 변동률)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
