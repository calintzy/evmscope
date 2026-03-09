import type { SupportedChain } from "../../types.js";
import { getClient } from "../../shared/rpc-client.js";
import { getPrice } from "../../shared/coingecko.js";
import { chains } from "../../shared/chains.js";
import { formatEther } from "viem";
import { fmtUsd } from "../format.js";

export async function cmdBalance(address: string, chain: SupportedChain, json: boolean) {
  const client = getClient(chain);
  const balance = await client.getBalance({ address: address as `0x${string}` });
  const formatted = formatEther(balance);
  const nativeSymbol = chains[chain]?.nativeCurrency;
  let valueUsd = 0;
  try {
    if (nativeSymbol?.coingeckoId) { const p = await getPrice(nativeSymbol.coingeckoId); valueUsd = Number(formatted) * p.priceUsd; }
  } catch { /* 가격 조회 실패 */ }

  if (json) { console.log(JSON.stringify({ address, chain, balance: formatted, symbol: nativeSymbol?.symbol, valueUsd: Math.round(valueUsd * 100) / 100 }, null, 2)); return; }
  console.log(`Balance — ${chain}`);
  console.log(`  Address: ${address}`);
  console.log(`  ${nativeSymbol?.symbol ?? "ETH"}: ${Number(formatted).toFixed(6)} (${fmtUsd(valueUsd)})`);
}
