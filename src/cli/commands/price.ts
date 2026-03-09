import type { SupportedChain } from "../../types.js";
import { getPrice, resolveCoingeckoId, resolveTokenMeta } from "../../shared/coingecko.js";
import { fmtUsd, fmtPct } from "../format.js";

export async function cmdPrice(token: string, chain: SupportedChain, json: boolean) {
  const id = resolveCoingeckoId(token, chain);
  if (!id) { console.error(`Token '${token}' not found`); process.exit(1); }
  const meta = resolveTokenMeta(token, chain);
  const data = await getPrice(id);
  if (json) { console.log(JSON.stringify({ token: meta?.symbol ?? token, ...data }, null, 2)); return; }
  console.log(`${meta?.symbol ?? token} (${meta?.name ?? id})`);
  console.log(`  Price:      ${fmtUsd(data.priceUsd)}`);
  console.log(`  24h Change: ${fmtPct(data.change24h)}`);
  console.log(`  Market Cap: ${fmtUsd(data.marketCap)}`);
  console.log(`  Volume 24h: ${fmtUsd(data.volume24h)}`);
}
