import type { SupportedChain } from "../../types.js";
import { resolveTokenMeta } from "../../shared/coingecko.js";

export async function cmdTokenInfo(token: string, chain: SupportedChain, json: boolean) {
  const meta = resolveTokenMeta(token, chain);
  if (!meta) { console.error(`Token '${token}' not found`); process.exit(1); }
  const addr = meta.addresses[chain];

  if (json) { console.log(JSON.stringify({ symbol: meta.symbol, name: meta.name, decimals: meta.decimals, address: addr ?? null, chain }, null, 2)); return; }
  console.log(`${meta.symbol} — ${meta.name}`);
  console.log(`  Decimals: ${meta.decimals}`);
  console.log(`  Address:  ${addr ?? "N/A (not on " + chain + ")"}`);
}
