import { z } from "zod";
import { formatUnits, isAddress, type Address } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";
import tokensData from "../data/tokens.json" with { type: "json" };

interface TokenInfoData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  chain: SupportedChain;
}

const TOKEN_INFO_CACHE_TTL = 3600; // 1시간

const ERC20_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const inputSchema = z.object({
  token: z.string().describe("토큰 심볼 (USDC) 또는 contract address (0x...)"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<TokenInfoData>> {
  const { token, chain } = args;

  // 주소 결정: 심볼이면 내장 DB에서 찾기
  let contractAddress: string;
  if (isAddress(token)) {
    contractAddress = token;
  } else {
    const tokenInfo = tokensData.find(
      (t) => t.symbol.toLowerCase() === token.toLowerCase(),
    );
    if (!tokenInfo) {
      return makeError(`Token '${token}' not found in built-in database`, "TOKEN_NOT_FOUND");
    }
    const addr = (tokenInfo.addresses as Record<string, string>)[chain];
    if (!addr) {
      return makeError(`Token '${token}' not available on ${chain}`, "TOKEN_NOT_FOUND");
    }
    contractAddress = addr;
  }

  const cacheKey = `tokeninfo:${chain}:${contractAddress.toLowerCase()}`;
  const cached = cache.get<TokenInfoData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  try {
    const client = getClient(chain);
    const address = contractAddress as Address;

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      client.readContract({ address, abi: ERC20_ABI, functionName: "name" }),
      client.readContract({ address, abi: ERC20_ABI, functionName: "symbol" }),
      client.readContract({ address, abi: ERC20_ABI, functionName: "decimals" }),
      client.readContract({ address, abi: ERC20_ABI, functionName: "totalSupply" }),
    ]);

    const data: TokenInfoData = {
      address: contractAddress,
      name: name as string,
      symbol: symbol as string,
      decimals: Number(decimals),
      totalSupply: formatUnits(totalSupply as bigint, Number(decimals)),
      chain,
    };

    cache.set(cacheKey, data, TOKEN_INFO_CACHE_TTL);
    return makeSuccess(chain, data, false);
  } catch (err) {
    // RPC 실패 시 내장 DB 폴백
    const fallback = tokensData.find((t) => {
      const addresses = t.addresses as Record<string, string>;
      return Object.values(addresses).some(
        (a) => a.toLowerCase() === contractAddress.toLowerCase(),
      );
    });

    if (fallback) {
      const data: TokenInfoData = {
        address: contractAddress,
        name: fallback.name,
        symbol: fallback.symbol,
        decimals: fallback.decimals,
        totalSupply: "N/A (from built-in database)",
        chain,
      };
      return makeSuccess(chain, data, false);
    }

    const message = err instanceof Error ? err.message : String(err);
    return makeError(`Failed to fetch token info: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getTokenInfo",
    "ERC-20 토큰의 메타데이터(이름, 심볼, 소수점, 총공급량)를 조회합니다",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
