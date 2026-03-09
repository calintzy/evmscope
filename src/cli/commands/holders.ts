import type { SupportedChain } from "../../types.js";
import { getTopTokenHolders } from "../../shared/ethplorer.js";
import { resolveTokenMeta } from "../../shared/coingecko.js";

export async function cmdHolders(token: string, chain: SupportedChain, json: boolean) {
  let tokenAddress = token;
  if (!token.startsWith("0x") || token.length !== 42) {
    const meta = resolveTokenMeta(token, chain);
    if (!meta) { console.error(`Token '${token}' not found`); process.exit(1); }
    tokenAddress = meta.addresses[chain];
    if (!tokenAddress) { console.error(`Token '${token}' not available on ${chain}`); process.exit(1); }
  }

  if (chain === "ethereum") {
    const result = await getTopTokenHolders(tokenAddress, 10);
    if (!result) { console.error("Failed to fetch holders"); process.exit(1); }
    if (json) { console.log(JSON.stringify({ token: tokenAddress, chain, holders: result.holders, totalHolders: result.totalHolders }, null, 2)); return; }
    console.log(`Top Holders — ${tokenAddress.slice(0, 10)}... (${chain})`);
    console.log(`  Total holders: ${result.totalHolders.toLocaleString()}`);
    console.log("─".repeat(50));
    for (const h of result.holders) {
      console.log(`  ${h.address.slice(0, 14)}...  ${String(h.balance).padStart(16)}  ${h.share.toFixed(2)}%`);
    }
  } else {
    console.error("Holder data via Ethplorer is Ethereum-only. Use --json with MCP for other chains.");
    process.exit(1);
  }
}
