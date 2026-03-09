import { z } from "zod";
import { isAddress } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeSuccess, makeError, isSupportedChain } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { getABI } from "../shared/etherscan.js";
import { cache } from "../shared/cache.js";

interface ContractABIData {
  address: string;
  chain: string;
  abi: unknown[];
  source: "etherscan" | "sourcify";
  contractName: string | null;
  isContract: boolean;
  functionCount: number;
  eventCount: number;
}

const ABI_CACHE_TTL = 86400; // 24시간

const inputSchema = z.object({
  address: z.string().describe("컨트랙트 주소 (0x...)"),
  chain: z.string().default("ethereum").describe("체인 (ethereum, polygon, arbitrum, base, optimism)"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<ContractABIData>> {
  const { address, chain } = args;

  if (!isSupportedChain(chain)) {
    return makeError(`Unsupported chain: ${chain}`, "CHAIN_NOT_SUPPORTED");
  }

  if (!isAddress(address)) {
    return makeError(`Invalid address: ${address}`, "INVALID_INPUT");
  }

  const cacheKey = `contractabi:${chain}:${address.toLowerCase()}`;
  const cached = cache.get<ContractABIData>(cacheKey);
  if (cached.hit) return makeSuccess(chain as SupportedChain, cached.data, true);

  const client = getClient(chain as SupportedChain);

  // 컨트랙트 여부 확인
  let isContract = false;
  try {
    const code = await client.getCode({ address: address as `0x${string}` });
    isContract = !!code && code !== "0x";
  } catch {
    // RPC 실패 시 무시, ABI 조회 시도는 계속
  }

  if (!isContract) {
    return makeError(`Address is not a contract: ${address}`, "ABI_NOT_FOUND");
  }

  // ABI 조회 (Etherscan → Sourcify)
  const abiResult = await getABI(address, chain as SupportedChain);

  if (!abiResult) {
    return makeError(`ABI not found for ${address} on ${chain}. Contract may not be verified.`, "ABI_NOT_FOUND");
  }

  const abi = abiResult.abi as Array<{ type?: string }>;
  const functionCount = abi.filter((item) => item.type === "function").length;
  const eventCount = abi.filter((item) => item.type === "event").length;

  const data: ContractABIData = {
    address,
    chain,
    abi: abiResult.abi,
    source: abiResult.source,
    contractName: abiResult.contractName,
    isContract: true,
    functionCount,
    eventCount,
  };

  cache.set(cacheKey, data, ABI_CACHE_TTL);
  return makeSuccess(chain as SupportedChain, data, false);
}

export function register(server: McpServer) {
  server.tool(
    "getContractABI",
    "컨트랙트 ABI를 조회합니다 (Etherscan → Sourcify 폴백, verified contract 필요)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
