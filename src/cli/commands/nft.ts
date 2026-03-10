import type { SupportedChain } from "../../types.js";
import { getClient } from "../../shared/rpc-client.js";

// ERC-721 ABI 조각
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

export async function cmdNFT(
  address: string,
  contractAddress: string,
  chain: SupportedChain,
  json: boolean,
) {
  const client = getClient(chain);
  const contract = contractAddress as `0x${string}`;
  const owner = address as `0x${string}`;

  // NFT 보유 수량 조회
  const balance = await client.readContract({
    address: contract,
    abi: ERC721_ABI,
    functionName: "balanceOf",
    args: [owner],
  });

  const count = Number(balance);
  const limit = Math.min(count, 50);
  const nfts: Array<{ tokenId: string; tokenURI: string }> = [];

  // 각 토큰 정보 조회
  for (let i = 0; i < limit; i++) {
    try {
      const tokenId = await client.readContract({
        address: contract,
        abi: ERC721_ABI,
        functionName: "tokenOfOwnerByIndex",
        args: [owner, BigInt(i)],
      });

      let tokenURI = "";
      try {
        tokenURI = (await client.readContract({
          address: contract,
          abi: ERC721_ABI,
          functionName: "tokenURI",
          args: [tokenId],
        })) as string;
      } catch {
        // tokenURI 미구현 컨트랙트
      }

      nfts.push({ tokenId: String(tokenId), tokenURI });
    } catch {
      break;
    }
  }

  if (json) {
    console.log(JSON.stringify({ chain, contractAddress, owner: address, totalBalance: count, nfts }, null, 2));
    return;
  }

  console.log(`NFT Info — ${chain}`);
  console.log(`  Owner:    ${address}`);
  console.log(`  Contract: ${contractAddress}`);
  console.log(`  Balance:  ${count} NFTs`);
  if (nfts.length > 0) {
    console.log(`  Tokens (showing ${nfts.length}/${count}):`);
    for (const nft of nfts) {
      console.log(`    #${nft.tokenId}${nft.tokenURI ? ` → ${nft.tokenURI.slice(0, 80)}` : ""}`);
    }
  }
}

export async function cmdNFTMetadata(
  contractAddress: string,
  tokenId: string,
  chain: SupportedChain,
  json: boolean,
) {
  const client = getClient(chain);
  const contract = contractAddress as `0x${string}`;

  // tokenURI 조회
  const tokenURI = (await client.readContract({
    address: contract,
    abi: ERC721_ABI,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
  })) as string;

  // IPFS URI 변환
  let fetchUrl = tokenURI;
  if (tokenURI.startsWith("ipfs://")) {
    fetchUrl = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
  }

  // 메타데이터 fetch
  const res = await fetch(fetchUrl);
  if (!res.ok) {
    console.error(`Failed to fetch metadata: ${res.status}`);
    process.exit(1);
  }
  const metadata = (await res.json()) as {
    name?: string;
    description?: string;
    image?: string;
    attributes?: Array<{ trait_type: string; value: string | number }>;
  };

  if (json) {
    console.log(JSON.stringify({ chain, contractAddress, tokenId, tokenURI, metadata }, null, 2));
    return;
  }

  console.log(`NFT Metadata — ${chain}`);
  console.log(`  Contract: ${contractAddress}`);
  console.log(`  Token ID: ${tokenId}`);
  console.log(`  Name:     ${metadata.name ?? "N/A"}`);
  console.log(`  Image:    ${metadata.image ?? "N/A"}`);
  if (metadata.description) {
    console.log(`  Desc:     ${metadata.description.slice(0, 200)}`);
  }
  if (metadata.attributes?.length) {
    console.log("  Attributes:");
    for (const attr of metadata.attributes) {
      console.log(`    ${attr.trait_type}: ${attr.value}`);
    }
  }
}
