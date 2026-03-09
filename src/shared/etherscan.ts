import { cache } from "./cache.js";
import chainsData from "../data/chains.json" with { type: "json" };
import type { SupportedChain } from "../types.js";

// 체인별 Etherscan API URL 매핑
const EXPLORER_API_URLS: Record<string, string> = {
  ethereum: "https://api.etherscan.io/api",
  polygon: "https://api.polygonscan.com/api",
  arbitrum: "https://api.arbiscan.io/api",
  base: "https://api.basescan.org/api",
  optimism: "https://api-optimistic.etherscan.io/api",
};

// Sourcify 체인 ID 매핑
const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
  optimism: 10,
};

const ABI_CACHE_TTL = 86400; // 24시간

function getApiKey(chain: SupportedChain): string | undefined {
  const keyMap: Record<string, string> = {
    ethereum: "EVMSCOPE_ETHERSCAN_KEY",
    polygon: "EVMSCOPE_POLYGONSCAN_KEY",
    arbitrum: "EVMSCOPE_ARBISCAN_KEY",
    base: "EVMSCOPE_BASESCAN_KEY",
    optimism: "EVMSCOPE_OPTIMISTIC_KEY",
  };
  return process.env[keyMap[chain]] || process.env.EVMSCOPE_ETHERSCAN_KEY;
}

export interface ABIResult {
  abi: unknown[];
  source: "etherscan" | "sourcify";
  contractName: string | null;
}

/** Etherscan에서 ABI 조회 */
async function fetchFromEtherscan(address: string, chain: SupportedChain): Promise<ABIResult | null> {
  const baseUrl = EXPLORER_API_URLS[chain];
  if (!baseUrl) return null;

  const apiKey = getApiKey(chain);
  const params = new URLSearchParams({
    module: "contract",
    action: "getabi",
    address,
    ...(apiKey ? { apikey: apiKey } : {}),
  });

  try {
    const res = await fetch(`${baseUrl}?${params}`);
    if (!res.ok) return null;

    const json = await res.json() as { status: string; result: string; message?: string };
    if (json.status === "1" && json.result) {
      const abi = JSON.parse(json.result);
      // 컨트랙트 이름 조회 시도
      const name = await fetchContractName(address, chain);
      return { abi, source: "etherscan", contractName: name };
    }
  } catch {
    // Etherscan 실패 시 무시
  }
  return null;
}

/** Etherscan에서 컨트랙트 이름 조회 */
async function fetchContractName(address: string, chain: SupportedChain): Promise<string | null> {
  const baseUrl = EXPLORER_API_URLS[chain];
  if (!baseUrl) return null;

  const apiKey = getApiKey(chain);
  const params = new URLSearchParams({
    module: "contract",
    action: "getsourcecode",
    address,
    ...(apiKey ? { apikey: apiKey } : {}),
  });

  try {
    const res = await fetch(`${baseUrl}?${params}`);
    if (!res.ok) return null;

    const json = await res.json() as { status: string; result: Array<{ ContractName?: string }> };
    if (json.status === "1" && json.result?.[0]?.ContractName) {
      return json.result[0].ContractName || null;
    }
  } catch {
    // 무시
  }
  return null;
}

/** Sourcify에서 ABI 조회 (폴백) */
async function fetchFromSourcify(address: string, chain: SupportedChain): Promise<ABIResult | null> {
  const chainId = CHAIN_IDS[chain];
  if (!chainId) return null;

  // full match → partial match 순서로 시도
  for (const matchType of ["full_match", "partial_match"]) {
    try {
      const url = `https://repo.sourcify.dev/contracts/${matchType}/${chainId}/${address}/metadata.json`;
      const res = await fetch(url);
      if (!res.ok) continue;

      const metadata = await res.json() as { output?: { abi?: unknown[] }; settings?: { compilationTarget?: Record<string, string> } };
      if (metadata.output?.abi) {
        const target = metadata.settings?.compilationTarget;
        const contractName = target ? Object.values(target)[0] ?? null : null;
        return { abi: metadata.output.abi, source: "sourcify", contractName };
      }
    } catch {
      // 다음 matchType 시도
    }
  }
  return null;
}

/** ABI 조회 (Etherscan → Sourcify 폴백, 24시간 캐시) */
export async function getABI(address: string, chain: SupportedChain): Promise<ABIResult | null> {
  const cacheKey = `abi:${chain}:${address.toLowerCase()}`;
  const cached = cache.get<ABIResult>(cacheKey);
  if (cached.hit) return cached.data;

  // Etherscan 먼저
  const etherscanResult = await fetchFromEtherscan(address, chain);
  if (etherscanResult) {
    cache.set(cacheKey, etherscanResult, ABI_CACHE_TTL);
    return etherscanResult;
  }

  // Sourcify 폴백
  const sourcifyResult = await fetchFromSourcify(address, chain);
  if (sourcifyResult) {
    cache.set(cacheKey, sourcifyResult, ABI_CACHE_TTL);
    return sourcifyResult;
  }

  return null;
}

export interface TokenTransfer {
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  timeStamp: string;
}

/** Etherscan에서 최근 토큰 전송 조회 */
export async function getTokenTransfers(
  contractAddress: string,
  chain: SupportedChain,
  limit: number = 100,
): Promise<TokenTransfer[]> {
  const baseUrl = EXPLORER_API_URLS[chain];
  if (!baseUrl) return [];

  const apiKey = getApiKey(chain);
  const cacheKey = `tokentx:${chain}:${contractAddress.toLowerCase()}:${limit}`;
  const cached = cache.get<TokenTransfer[]>(cacheKey);
  if (cached.hit) return cached.data;

  const params = new URLSearchParams({
    module: "account",
    action: "tokentx",
    contractaddress: contractAddress,
    page: "1",
    offset: String(limit),
    sort: "desc",
    ...(apiKey ? { apikey: apiKey } : {}),
  });

  try {
    const res = await fetch(`${baseUrl}?${params}`);
    if (!res.ok) return [];

    const json = (await res.json()) as { status: string; result: TokenTransfer[] };
    if (json.status === "1" && Array.isArray(json.result)) {
      cache.set(cacheKey, json.result, 60);
      return json.result;
    }
  } catch {
    // 무시
  }
  return [];
}

/** 4byte.directory에서 함수 시그니처 조회 */
export async function lookup4byte(selector: string): Promise<string | null> {
  const cacheKey = `4byte:${selector}`;
  const cached = cache.get<string>(cacheKey);
  if (cached.hit) return cached.data;

  try {
    const url = `https://www.4byte.directory/api/v1/signatures/?hex_signature=${selector}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const json = await res.json() as { results: Array<{ text_signature: string }> };
    if (json.results?.length > 0) {
      const sig = json.results[0].text_signature;
      cache.set(cacheKey, sig, ABI_CACHE_TTL);
      return sig;
    }
  } catch {
    // 무시
  }
  return null;
}
