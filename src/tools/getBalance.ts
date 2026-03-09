import { z } from "zod";
import { formatUnits, isAddress, type Address } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";
import { getPrice, resolveCoingeckoId } from "../shared/coingecko.js";
import { tokens as tokensData } from "../shared/tokens.js";
import { chains } from "../shared/chains.js";

interface TokenBalance {
  symbol: string;
  address: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  valueUsd: number;
}

interface BalanceData {
  address: string;
  nativeBalance: {
    symbol: string;
    balance: string;
    balanceFormatted: string;
    valueUsd: number;
  };
  tokenBalances: TokenBalance[];
  totalValueUsd: number;
}

const BALANCE_CACHE_TTL = 30;
const DEFAULT_TOKENS = ["USDC", "USDT", "DAI", "WETH"];

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const inputSchema = z.object({
  address: z.string().describe("조회할 지갑 주소 (0x...)"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
  tokens: z.array(z.string()).optional().describe("조회할 토큰 심볼 목록 (기본: USDC, USDT, DAI, WETH)"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<BalanceData>> {
  const { address, chain, tokens } = args;

  if (!isAddress(address)) {
    return makeError(`Invalid address: ${address}`, "INVALID_INPUT");
  }

  const cacheKey = `balance:${chain}:${address}`;
  const cached = cache.get<BalanceData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  try {
    const client = getClient(chain);
    const chainConfig = chains[chain];

    // 네이티브 잔고 조회
    const nativeBalanceWei = await client.getBalance({ address: address as Address });
    const nativeFormatted = formatUnits(nativeBalanceWei, 18);

    // 네이티브 토큰 USD 가격
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

    // ERC-20 토큰 잔고 조회
    const tokenSymbols = tokens ?? DEFAULT_TOKENS;
    const tokenBalances: TokenBalance[] = [];

    for (const symbol of tokenSymbols) {
      const tokenInfo = tokensData.find(
        (t) => t.symbol.toLowerCase() === symbol.toLowerCase(),
      );
      if (!tokenInfo) continue;

      const tokenAddress = tokenInfo.addresses[chain];
      if (!tokenAddress) continue;

      try {
        const balance = await client.readContract({
          address: tokenAddress as Address,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as Address],
        });

        const formatted = formatUnits(balance, tokenInfo.decimals);

        let valueUsd = 0;
        try {
          const price = await getPrice(tokenInfo.coingeckoId);
          valueUsd = parseFloat(formatted) * price.priceUsd;
        } catch {
          // 가격 조회 실패 무시
        }

        tokenBalances.push({
          symbol: tokenInfo.symbol,
          address: tokenAddress,
          balance: balance.toString(),
          balanceFormatted: formatted,
          decimals: tokenInfo.decimals,
          valueUsd: Math.round(valueUsd * 100) / 100,
        });
      } catch {
        // 개별 토큰 조회 실패는 건너뜀
      }
    }

    const totalValueUsd =
      Math.round(
        (nativeValueUsd + tokenBalances.reduce((sum, t) => sum + t.valueUsd, 0)) * 100,
      ) / 100;

    const data: BalanceData = {
      address,
      nativeBalance: {
        symbol: chainConfig?.nativeCurrency?.symbol ?? "ETH",
        balance: nativeBalanceWei.toString(),
        balanceFormatted: nativeFormatted,
        valueUsd: Math.round(nativeValueUsd * 100) / 100,
      },
      tokenBalances,
      totalValueUsd,
    };

    cache.set(cacheKey, data, BALANCE_CACHE_TTL);
    return makeSuccess(chain, data, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(`Failed to fetch balance: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getBalance",
    "지갑 주소의 네이티브 토큰 + ERC-20 토큰 잔고를 조회합니다 (USD 환산 포함)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
