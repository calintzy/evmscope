import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";

// NFT 메타데이터 속성 항목
interface NFTAttribute {
  trait_type?: string;
  value: string | number;
}

// getNFTMetadata 반환 데이터 구조
interface NFTMetadataData {
  contractAddress: string;
  tokenId: string;
  tokenURI: string;
  name?: string;
  description?: string;
  image?: string;
  attributes?: NFTAttribute[];
}

// 캐시 TTL: 3600초 (1시간, NFT 메타데이터는 거의 변경되지 않음)
const NFT_METADATA_CACHE_TTL = 3600;

// tokenURI 조회용 최소 ABI
const ERC721_TOKEN_URI_ABI = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

// IPFS URI를 HTTP 게이트웨이 URL로 변환
function resolveURI(uri: string): string {
  if (uri.startsWith("ipfs://")) {
    return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  return uri;
}

const inputSchema = z.object({
  contractAddress: z.string().describe("NFT 컨트랙트 주소 (0x...)"),
  tokenId: z.string().describe("조회할 토큰 ID"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<NFTMetadataData>> {
  const { contractAddress, tokenId, chain } = args;

  const cacheKey = `nftmeta:${chain}:${contractAddress.toLowerCase()}:${tokenId}`;
  const cached = cache.get<NFTMetadataData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  // tokenId를 bigint로 변환 (유효성 검사)
  let tokenIdBigInt: bigint;
  try {
    tokenIdBigInt = BigInt(tokenId);
  } catch {
    return makeError(`Invalid tokenId: '${tokenId}' is not a valid integer`, "INVALID_INPUT");
  }

  try {
    const client = getClient(chain);

    // 1단계: 컨트랙트에서 tokenURI 조회
    const rawURI = await client.readContract({
      address: contractAddress as `0x${string}`,
      abi: ERC721_TOKEN_URI_ABI,
      functionName: "tokenURI",
      args: [tokenIdBigInt],
    }) as string;

    // IPFS URI 처리
    const resolvedURI = resolveURI(rawURI);

    // data URI (base64 인코딩된 JSON) 처리
    if (resolvedURI.startsWith("data:application/json")) {
      try {
        const base64Part = resolvedURI.split(",")[1];
        const jsonStr = Buffer.from(base64Part, "base64").toString("utf-8");
        const meta = JSON.parse(jsonStr);

        const data: NFTMetadataData = {
          contractAddress,
          tokenId,
          tokenURI: rawURI,
          name: meta.name,
          description: meta.description,
          image: meta.image ? resolveURI(meta.image) : undefined,
          attributes: meta.attributes,
        };

        cache.set(cacheKey, data, NFT_METADATA_CACHE_TTL);
        return makeSuccess(chain, data, false);
      } catch {
        return makeError(`Failed to parse base64-encoded metadata for tokenId ${tokenId}`, "RPC_ERROR");
      }
    }

    // 2단계: URI로 HTTP 요청하여 메타데이터 JSON 취득
    let metaJson: Record<string, unknown>;
    try {
      const response = await fetch(resolvedURI, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000), // 10초 타임아웃
      });

      if (!response.ok) {
        return makeError(
          `Failed to fetch metadata from URI: HTTP ${response.status}`,
          "API_ERROR",
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("json") && !contentType.includes("text")) {
        return makeError(
          `Unexpected content-type '${contentType}' from metadata URI`,
          "API_ERROR",
        );
      }

      const text = await response.text();
      try {
        metaJson = JSON.parse(text);
      } catch {
        return makeError(`Metadata URI did not return valid JSON for tokenId ${tokenId}`, "API_ERROR");
      }
    } catch (err) {
      // fetch 자체 실패 (네트워크 오류, 타임아웃 등)
      if (err instanceof Error && (err.name === "AbortError" || err.message.includes("timeout"))) {
        return makeError(`Metadata fetch timed out for tokenId ${tokenId}`, "API_ERROR");
      }
      const message = err instanceof Error ? err.message : String(err);
      return makeError(`Failed to fetch metadata: ${message}`, "API_ERROR");
    }

    // 3단계: 메타데이터 필드 추출 및 image URI 정규화
    const data: NFTMetadataData = {
      contractAddress,
      tokenId,
      tokenURI: rawURI,
      name: typeof metaJson.name === "string" ? metaJson.name : undefined,
      description: typeof metaJson.description === "string" ? metaJson.description : undefined,
      image: typeof metaJson.image === "string" ? resolveURI(metaJson.image) : undefined,
      attributes: Array.isArray(metaJson.attributes)
        ? (metaJson.attributes as NFTAttribute[])
        : undefined,
    };

    cache.set(cacheKey, data, NFT_METADATA_CACHE_TTL);
    return makeSuccess(chain, data, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(`Failed to fetch NFT metadata: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getNFTMetadata",
    "ERC-721 NFT의 메타데이터(이름, 설명, 이미지, 속성)를 조회합니다. IPFS URI 자동 변환 지원",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
