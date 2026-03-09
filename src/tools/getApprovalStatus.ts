import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";
import { resolveTokenMeta } from "../shared/coingecko.js";
import protocolsData from "../data/protocols.json" with { type: "json" };

// ERC-20 allowance ABI
const ERC20_ALLOWANCE_ABI = [
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

interface ApprovalEntry {
  protocol: string;
  spender: string;
  allowance: string;
  isUnlimited: boolean;
}

interface ApprovalStatusData {
  owner: string;
  token: string;
  tokenAddress: string;
  approvals: ApprovalEntry[];
  riskLevel: "safe" | "moderate" | "high";
}

const CACHE_TTL = 60;
const UNLIMITED_THRESHOLD = 2n ** 128n;

const inputSchema = z.object({
  owner: z.string().describe("지갑 주소"),
  token: z.string().describe("토큰 심볼 (USDC, USDT) 또는 contract address"),
  spender: z.string().optional().describe("특정 spender 주소 (미지정 시 주요 프로토콜 자동 조회)"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
});

function getProtocolSpenders(chain: SupportedChain): Array<{ name: string; address: string }> {
  const spenders: Array<{ name: string; address: string }> = [];
  for (const protocol of protocolsData) {
    const chainAddresses = protocol.addresses[chain as keyof typeof protocol.addresses] as Record<string, string> | undefined;
    if (!chainAddresses) continue;
    for (const [key, addr] of Object.entries(chainAddresses)) {
      if (["router", "pool", "cUSDCv3", "cWETHv3", "stETH"].includes(key)) {
        spenders.push({ name: `${protocol.name} (${key})`, address: addr });
      }
    }
  }
  return spenders;
}

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<ApprovalStatusData>> {
  const { owner, token, spender, chain } = args;

  // 토큰 주소 확인
  let tokenAddress = token;
  if (!token.startsWith("0x") || token.length !== 42) {
    const meta = resolveTokenMeta(token, chain);
    if (!meta) return makeError(`Token '${token}' not found on ${chain}`, "TOKEN_NOT_FOUND");
    const addresses = meta.addresses as Record<string, string>;
    const addr = addresses[chain];
    if (!addr) return makeError(`Token '${token}' not available on ${chain}`, "TOKEN_NOT_FOUND");
    tokenAddress = addr;
  }

  const cacheKey = `approval:${chain}:${owner}:${tokenAddress.toLowerCase()}:${spender ?? "auto"}`;
  const cached = cache.get<ApprovalStatusData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  try {
    const client = getClient(chain);
    const spendersToCheck = spender
      ? [{ name: "custom", address: spender }]
      : getProtocolSpenders(chain);

    if (spendersToCheck.length === 0) {
      return makeError(`No known protocol spenders for ${chain}`, "INVALID_INPUT");
    }

    const results = await Promise.allSettled(
      spendersToCheck.map(async (s) => {
        const allowance = await client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ALLOWANCE_ABI,
          functionName: "allowance",
          args: [owner as `0x${string}`, s.address as `0x${string}`],
        });
        return { ...s, allowance: allowance as bigint };
      }),
    );

    const approvals: ApprovalEntry[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        const { name, address, allowance: raw } = result.value;
        if (raw > 0n) {
          approvals.push({
            protocol: name,
            spender: address,
            allowance: raw >= UNLIMITED_THRESHOLD ? "unlimited" : raw.toString(),
            isUnlimited: raw >= UNLIMITED_THRESHOLD,
          });
        }
      }
    }

    // 리스크 레벨 결정
    const unlimitedCount = approvals.filter((a) => a.isUnlimited).length;
    let riskLevel: "safe" | "moderate" | "high" = "safe";
    if (unlimitedCount >= 3) riskLevel = "high";
    else if (unlimitedCount >= 1 || approvals.length >= 3) riskLevel = "moderate";

    const tokenMeta = resolveTokenMeta(token);
    const data: ApprovalStatusData = {
      owner,
      token: tokenMeta?.symbol ?? token,
      tokenAddress,
      approvals,
      riskLevel,
    };

    cache.set(cacheKey, data, CACHE_TTL);
    return makeSuccess(chain, data, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(`Failed to check approvals: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getApprovalStatus",
    "ERC-20 토큰 승인(allowance) 상태를 조회합니다. 주요 프로토콜 자동 체크, 리스크 레벨 판정",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
