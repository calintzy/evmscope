import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { cache } from "../shared/cache.js";
import { sanitizeError } from "../shared/validate.js";

// ERC-721 NFT 정보 항목
interface NFTItem {
  tokenId: string;
  tokenURI: string;
  contractAddress: string;
}

// getNFTInfo 반환 데이터 구조
interface NFTInfoData {
  owner: string;
  contractAddress: string;
  totalOwned: number;
  tokens: NFTItem[];
}

// 캐시 TTL: 60초 (NFT 소유권은 비교적 자주 변경될 수 있음)
const NFT_INFO_CACHE_TTL = 60;

// 한 번에 조회할 최대 토큰 수
const MAX_TOKENS = 50;

// ERC-721 필수 ABI 조각 (balanceOf, tokenOfOwnerByIndex, tokenURI)
const ERC721_ABI = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokenOfOwnerByIndex",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

const inputSchema = z.object({
  address: z.string().describe("조회할 지갑 주소 (0x...)"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
  contractAddress: z.string().optional().describe("특정 NFT 컨트랙트 주소 (미지정 시 오류 반환)"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<NFTInfoData>> {
  const { address, chain, contractAddress } = args;

  // contractAddress 없이는 인덱서 없이 NFT 열거 불가
  if (!contractAddress) {
    return makeError(
      "contractAddress is required. Enumerating all NFTs without an indexer is not supported.",
      "INVALID_INPUT",
    );
  }

  const cacheKey = `nftinfo:${chain}:${contractAddress.toLowerCase()}:${address.toLowerCase()}`;
  const cached = cache.get<NFTInfoData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  try {
    const client = getClient(chain);
    const ownerAddr = address as `0x${string}`;
    const contractAddr = contractAddress as `0x${string}`;

    // 1단계: balanceOf로 보유 수량 확인
    const balance = await client.readContract({
      address: contractAddr,
      abi: ERC721_ABI,
      functionName: "balanceOf",
      args: [ownerAddr],
    }) as bigint;

    const tokenCount = Number(balance);

    // 보유 토큰 없으면 빈 배열 반환
    if (tokenCount === 0) {
      const data: NFTInfoData = {
        owner: address,
        contractAddress,
        totalOwned: 0,
        tokens: [],
      };
      cache.set(cacheKey, data, NFT_INFO_CACHE_TTL);
      return makeSuccess(chain, data, false);
    }

    // 최대 MAX_TOKENS개까지만 조회
    const fetchCount = Math.min(tokenCount, MAX_TOKENS);

    // 2단계: tokenOfOwnerByIndex로 각 인덱스의 tokenId 조회
    const tokenIdResults = await Promise.allSettled(
      Array.from({ length: fetchCount }, (_, i) =>
        client.readContract({
          address: contractAddr,
          abi: ERC721_ABI,
          functionName: "tokenOfOwnerByIndex",
          args: [ownerAddr, BigInt(i)],
        }),
      ),
    );

    // 성공한 tokenId 목록 수집
    const tokenIds: bigint[] = [];
    for (const result of tokenIdResults) {
      if (result.status === "fulfilled") {
        tokenIds.push(result.value as bigint);
      }
    }

    // 3단계: 각 tokenId에 대해 tokenURI 조회
    const tokenURIResults = await Promise.allSettled(
      tokenIds.map((tokenId) =>
        client.readContract({
          address: contractAddr,
          abi: ERC721_ABI,
          functionName: "tokenURI",
          args: [tokenId],
        }),
      ),
    );

    // NFTItem 배열 구성
    const tokens: NFTItem[] = tokenIds.map((tokenId, i) => {
      const uriResult = tokenURIResults[i];
      return {
        tokenId: tokenId.toString(),
        tokenURI: uriResult.status === "fulfilled" ? (uriResult.value as string) : "",
        contractAddress,
      };
    });

    const data: NFTInfoData = {
      owner: address,
      contractAddress,
      totalOwned: tokenCount,
      tokens,
    };

    cache.set(cacheKey, data, NFT_INFO_CACHE_TTL);
    return makeSuccess(chain, data, false);
  } catch (err) {
    const message = sanitizeError(err);
    return makeError(`Failed to fetch NFT info: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getNFTInfo",
    "특정 컨트랙트에서 지갑 주소가 보유한 ERC-721 NFT 목록과 tokenURI를 조회합니다",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
