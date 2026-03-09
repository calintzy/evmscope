import { z } from "zod";
import { isAddress } from "viem";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { makeSuccess, makeError, isSupportedChain } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";
import labelsData from "../data/labels.json" with { type: "json" };
import protocolsData from "../data/protocols.json" with { type: "json" };

interface IdentifyData {
  address: string;
  chain: string;
  label: string | null;
  category: string | null;
  protocol: string | null;
  isContract: boolean;
  tags: string[];
}

const IDENTIFY_CACHE_TTL = 300; // 5분

const inputSchema = z.object({
  address: z.string().describe("이더리움 주소 (0x...)"),
  chain: z.string().default("ethereum").describe("체인 (ethereum, polygon, arbitrum, base, optimism)"),
});

/** labels.json에서 주소 라벨 조회 */
function findLabel(address: string): { label: string; category: string; tags: string[] } | null {
  const addr = address.toLowerCase();
  for (const entry of labelsData) {
    if (entry.address.toLowerCase() === addr) {
      return { label: entry.label, category: entry.category, tags: entry.tags };
    }
  }
  return null;
}

/** protocols.json에서 프로토콜 이름 조회 */
function findProtocol(address: string, chain: string): { name: string; category: string; role: string } | null {
  const addr = address.toLowerCase();
  for (const protocol of protocolsData) {
    const chainAddresses = (protocol.addresses as Record<string, Record<string, string>>)[chain];
    if (!chainAddresses) continue;

    for (const [role, protocolAddr] of Object.entries(chainAddresses)) {
      if (protocolAddr.toLowerCase() === addr) {
        return { name: protocol.name, category: protocol.category, role };
      }
    }
  }
  return null;
}

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<IdentifyData>> {
  const { address, chain } = args;

  if (!isSupportedChain(chain)) {
    return makeError(`Unsupported chain: ${chain}`, "CHAIN_NOT_SUPPORTED");
  }

  if (!isAddress(address)) {
    return makeError(`Invalid address: ${address}`, "INVALID_INPUT");
  }

  const cacheKey = `identify:${chain}:${address.toLowerCase()}`;
  const cached = cache.get<IdentifyData>(cacheKey);
  if (cached.hit) return makeSuccess(chain as SupportedChain, cached.data, true);

  // 라벨 DB 조회
  const labelInfo = findLabel(address);

  // 프로토콜 DB 조회
  const protocolInfo = findProtocol(address, chain);

  // 컨트랙트 여부 확인
  let isContract = false;
  const client = getClient(chain as SupportedChain);
  try {
    const code = await client.getCode({ address: address as `0x${string}` });
    isContract = !!code && code !== "0x";
  } catch {
    // RPC 실패 시 무시
  }

  // 결과 조합
  let label = labelInfo?.label ?? null;
  let category = labelInfo?.category ?? null;
  let protocol: string | null = null;
  let tags = labelInfo?.tags ?? [];

  if (protocolInfo) {
    protocol = protocolInfo.name;
    if (!label) {
      label = `${protocolInfo.name} (${protocolInfo.role})`;
    }
    if (!category) {
      category = protocolInfo.category;
    }
    if (!tags.includes(protocolInfo.category)) {
      tags = [...tags, protocolInfo.category];
    }
  }

  // 카테고리 추론
  if (!category && isContract) {
    category = "contract";
  } else if (!category) {
    category = "eoa";
  }

  const data: IdentifyData = {
    address,
    chain,
    label,
    category,
    protocol,
    isContract,
    tags,
  };

  cache.set(cacheKey, data, IDENTIFY_CACHE_TTL);
  return makeSuccess(chain as SupportedChain, data, false);
}

export function register(server: McpServer) {
  server.tool(
    "identifyAddress",
    "주소를 식별합니다 (거래소, DeFi 프로토콜, 고래 지갑, 컨트랙트/EOA 분류)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
