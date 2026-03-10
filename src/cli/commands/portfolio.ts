import { formatUnits, formatEther } from "viem";
import type { SupportedChain } from "../../types.js";
import { getClient } from "../../shared/rpc-client.js";
import { getPrice, resolveCoingeckoId } from "../../shared/coingecko.js";
import { tokens as tokensData } from "../../shared/tokens.js";
import { chains } from "../../shared/chains.js";

// ERC-20 balanceOf ABI
const ERC20_BALANCE_ABI = [{
  name: "balanceOf",
  type: "function",
  stateMutability: "view",
  inputs: [{ name: "account", type: "address" }],
  outputs: [{ name: "", type: "uint256" }],
}] as const;

// ERC-20 decimals ABI
const ERC20_DECIMALS_ABI = [{
  name: "decimals",
  type: "function",
  stateMutability: "view",
  inputs: [],
  outputs: [{ name: "", type: "uint8" }],
}] as const;

interface Asset {
  symbol: string;
  name: string;
  balance: string;
  balanceUsd: number;
  percentage: number;
  type: "native" | "erc20";
}

export async function cmdPortfolio(
  address: string,
  chain: SupportedChain,
  json: boolean,
) {
  const client = getClient(chain);
  const chainConfig = chains[chain];
  const assets: Asset[] = [];

  // 1. 네이티브 잔고
  const nativeBalance = await client.getBalance({ address: address as `0x${string}` });
  const nativeFormatted = formatEther(nativeBalance);
  const nativeCoingeckoId = chainConfig?.nativeCurrency?.coingeckoId;
  let nativeUsd = 0;
  if (nativeCoingeckoId) {
    const price = await getPrice(nativeCoingeckoId);
    if (price) nativeUsd = parseFloat(nativeFormatted) * price.priceUsd;
  }

  assets.push({
    symbol: chainConfig?.nativeCurrency?.symbol ?? "ETH",
    name: chainConfig?.name ?? chain,
    balance: parseFloat(nativeFormatted).toFixed(6),
    balanceUsd: Math.round(nativeUsd * 100) / 100,
    percentage: 0,
    type: "native",
  });

  // 2. ERC-20 토큰 잔고
  const chainTokens = tokensData.filter((t) =>
    t.addresses && (t.addresses as Record<string, string>)[chain],
  );

  const tokenResults = await Promise.allSettled(
    chainTokens.map(async (token) => {
      const tokenAddr = (token.addresses as Record<string, string>)[chain];
      try {
        const balance = await client.readContract({
          address: tokenAddr as `0x${string}`,
          abi: ERC20_BALANCE_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        });
        if (balance === 0n) return null;

        let decimals = 18;
        try {
          decimals = await client.readContract({
            address: tokenAddr as `0x${string}`,
            abi: ERC20_DECIMALS_ABI,
            functionName: "decimals",
          });
        } catch { /* 기본값 사용 */ }

        const formatted = formatUnits(balance, decimals);
        let usd = 0;
        if (token.coingeckoId) {
          const price = await getPrice(token.coingeckoId);
          if (price) usd = parseFloat(formatted) * price.priceUsd;
        }

        return {
          symbol: token.symbol,
          name: token.name ?? token.symbol,
          balance: parseFloat(formatted).toFixed(6),
          balanceUsd: Math.round(usd * 100) / 100,
          percentage: 0,
          type: "erc20" as const,
        };
      } catch {
        return null;
      }
    }),
  );

  for (const r of tokenResults) {
    if (r.status === "fulfilled" && r.value) assets.push(r.value);
  }

  // 3. 총 가치 및 비율 계산
  const totalUsd = assets.reduce((sum, a) => sum + a.balanceUsd, 0);
  for (const a of assets) {
    a.percentage = totalUsd > 0 ? Math.round((a.balanceUsd / totalUsd) * 10000) / 100 : 0;
  }

  // USD 기준 내림차순
  assets.sort((a, b) => b.balanceUsd - a.balanceUsd);

  if (json) {
    console.log(JSON.stringify({
      chain,
      address,
      totalValueUsd: Math.round(totalUsd * 100) / 100,
      assetCount: assets.length,
      assets,
    }, null, 2));
    return;
  }

  console.log(`Portfolio — ${chain}`);
  console.log(`  Address: ${address}`);
  console.log(`  Total:   $${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`  Assets:  ${assets.length}`);
  console.log("");

  for (const a of assets) {
    const usdStr = a.balanceUsd > 0 ? ` ($${a.balanceUsd.toLocaleString()})` : "";
    const pctStr = a.percentage > 0 ? ` ${a.percentage}%` : "";
    console.log(`  ${a.symbol}: ${a.balance}${usdStr}${pctStr}`);
  }
}
