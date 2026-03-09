import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getTopTokenHolders } from "../shared/ethplorer.js";
import { getTokenTransfers } from "../shared/etherscan.js";
import { resolveTokenMeta } from "../shared/coingecko.js";
import { cache } from "../shared/cache.js";

interface HolderInfo {
  address: string;
  balance: string;
  share: number;
}

interface TokenHoldersData {
  token: string;
  chain: string;
  holders: HolderInfo[];
  totalHolders: number | null;
}

const inputSchema = z.object({
  token: z.string().describe("토큰 주소 (0x...) 또는 심볼 (USDC, WETH 등)"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
  limit: z.number().optional().default(10).describe("조회할 홀더 수 (기본 10, 최대 100)"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<TokenHoldersData>> {
  const { token, chain } = args;
  const limit = Math.min(args.limit ?? 10, 100);

  // 토큰 주소 해석
  let tokenAddress = token;
  if (!token.startsWith("0x") || token.length !== 42) {
    const meta = resolveTokenMeta(token, chain);
    if (!meta) return makeError(`Token '${token}' not found`, "TOKEN_NOT_FOUND");
    const addresses = meta.addresses;
    tokenAddress = addresses[chain];
    if (!tokenAddress) return makeError(`Token '${token}' not available on ${chain}`, "TOKEN_NOT_FOUND");
  }

  const cacheKey = `holders:${chain}:${tokenAddress.toLowerCase()}:${limit}`;
  const cached = cache.get<TokenHoldersData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  try {
    if (chain === "ethereum") {
      // Ethplorer API (Ethereum 전용)
      const result = await getTopTokenHolders(tokenAddress, limit);
      if (!result) return makeError("Failed to fetch holder data from Ethplorer", "API_ERROR");

      const data: TokenHoldersData = {
        token: tokenAddress,
        chain,
        holders: result.holders.map((h) => ({
          address: h.address,
          balance: String(h.balance),
          share: h.share,
        })),
        totalHolders: result.totalHolders,
      };

      cache.set(cacheKey, data, 600);
      return makeSuccess(chain, data, false);
    } else {
      // 기타 체인: Etherscan tokentx 기반 집계
      const transfers = await getTokenTransfers(tokenAddress, chain, 1000);
      if (transfers.length === 0) return makeError("No transfer data available", "API_ERROR");

      // 잔고 집계
      const balances = new Map<string, bigint>();
      const decimals = parseInt(transfers[0]?.tokenDecimal ?? "18");

      for (const tx of transfers) {
        const from = tx.from.toLowerCase();
        const to = tx.to.toLowerCase();
        const value = BigInt(tx.value);
        balances.set(from, (balances.get(from) ?? 0n) - value);
        balances.set(to, (balances.get(to) ?? 0n) + value);
      }

      // 양수 잔고만 필터, 내림차순 정렬
      const holders = Array.from(balances.entries())
        .filter(([, bal]) => bal > 0n)
        .sort(([, a], [, b]) => (b > a ? 1 : b < a ? -1 : 0))
        .slice(0, limit);

      const totalBalance = holders.reduce((sum, [, bal]) => sum + bal, 0n);

      const data: TokenHoldersData = {
        token: tokenAddress,
        chain,
        holders: holders.map(([addr, bal]) => ({
          address: addr,
          balance: (Number(bal) / Math.pow(10, decimals)).toFixed(6),
          share: totalBalance > 0n ? Math.round(Number((bal * 10000n) / totalBalance)) / 100 : 0,
        })),
        totalHolders: null,
      };

      cache.set(cacheKey, data, 600);
      return makeSuccess(chain, data, false);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(`Failed to fetch holders: ${message}`, "API_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getTokenHolders",
    "토큰의 상위 홀더를 조회합니다 (Ethereum: Ethplorer, 기타 체인: Etherscan 집계, 주소/점유율/잔고)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
