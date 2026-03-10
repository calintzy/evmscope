import { z } from "zod";
import { formatUnits } from "viem";
import type { Address } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";
import { getPrice } from "../shared/coingecko.js";
import { tokens as tokensData } from "../shared/tokens.js";
import { chains } from "../shared/chains.js";
import { sanitizeError } from "../shared/validate.js";
import { isAddress } from "viem";

// 포트폴리오 자산 항목
interface PortfolioAsset {
  symbol: string;
  name: string;
  balance: string;
  balanceUsd: number;
  percentage: number;
  type: "native" | "erc20";
  address?: string;
}

// 포트폴리오 응답 데이터
interface PortfolioData {
  address: string;
  chain: SupportedChain;
  totalValueUsd: number;
  assets: PortfolioAsset[];
  assetCount: number;
}

const PORTFOLIO_CACHE_TTL = 120;

const ERC20_BALANCE_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const inputSchema = z.object({
  address: z.string().describe("조회할 지갑 주소 (0x...)"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<PortfolioData>> {
  const { address, chain } = args;

  if (!isAddress(address)) {
    return makeError(`Invalid address: ${address}`, "INVALID_INPUT");
  }

  const cacheKey = `portfolio:${chain}:${address}`;
  const cached = cache.get<PortfolioData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  try {
    const client = getClient(chain);
    const chainConfig = chains[chain];
    const assets: PortfolioAsset[] = [];

    // 네이티브 토큰 잔고 조회
    const nativeBalanceWei = await client.getBalance({ address: address as Address });
    const nativeFormatted = formatUnits(nativeBalanceWei, 18);
    const nativeSymbol = chainConfig?.nativeCurrency?.symbol ?? "ETH";
    const nativeName = chainConfig?.nativeCurrency?.name ?? "Ether";

    let nativeValueUsd = 0;
    try {
      const nativeId = chainConfig?.nativeCurrency?.coingeckoId;
      if (nativeId) {
        const price = await getPrice(nativeId);
        nativeValueUsd = parseFloat(nativeFormatted) * price.priceUsd;
      }
    } catch {
      // 가격 조회 실패 무시
    }

    if (nativeBalanceWei > 0n) {
      assets.push({
        symbol: nativeSymbol,
        name: nativeName,
        balance: nativeFormatted,
        balanceUsd: Math.round(nativeValueUsd * 100) / 100,
        percentage: 0, // 나중에 계산
        type: "native",
      });
    }

    // 해당 체인에 주소가 있는 모든 토큰의 잔고 조회
    for (const tokenInfo of tokensData) {
      const tokenAddress = tokenInfo.addresses[chain];
      if (!tokenAddress) continue;

      try {
        const balance = await client.readContract({
          address: tokenAddress as Address,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [address as Address],
        });

        // 잔고가 0인 토큰은 건너뜀
        if (balance === 0n) continue;

        const formatted = formatUnits(balance, tokenInfo.decimals);

        let valueUsd = 0;
        try {
          const price = await getPrice(tokenInfo.coingeckoId);
          valueUsd = parseFloat(formatted) * price.priceUsd;
        } catch {
          // 가격 조회 실패 무시
        }

        assets.push({
          symbol: tokenInfo.symbol,
          name: tokenInfo.name,
          balance: formatted,
          balanceUsd: Math.round(valueUsd * 100) / 100,
          percentage: 0, // 나중에 계산
          type: "erc20",
          address: tokenAddress,
        });
      } catch {
        // 개별 토큰 조회 실패는 건너뜀
      }
    }

    // balanceUsd 내림차순 정렬
    assets.sort((a, b) => b.balanceUsd - a.balanceUsd);

    // 총 포트폴리오 가치 합산
    const totalValueUsd =
      Math.round(assets.reduce((sum, a) => sum + a.balanceUsd, 0) * 100) / 100;

    // 비율 계산
    if (totalValueUsd > 0) {
      for (const asset of assets) {
        asset.percentage = Math.round((asset.balanceUsd / totalValueUsd) * 10000) / 100;
      }
    }

    const data: PortfolioData = {
      address,
      chain,
      totalValueUsd,
      assets,
      assetCount: assets.length,
    };

    cache.set(cacheKey, data, PORTFOLIO_CACHE_TTL);
    return makeSuccess(chain, data, false);
  } catch (err) {
    const message = sanitizeError(err);
    return makeError(`Failed to fetch portfolio: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getPortfolio",
    "지갑의 전체 자산 포트폴리오(네이티브 + ERC-20 토큰, USD 가치, 비율)를 한 번에 조회합니다",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
