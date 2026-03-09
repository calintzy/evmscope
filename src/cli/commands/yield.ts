import { getYieldPools } from "../../shared/defillama.js";
import { fmtUsd } from "../format.js";

export async function cmdYield(protocol: string | undefined, chain: string | undefined, json: boolean) {
  const pools = await getYieldPools({
    protocol: protocol || undefined,
    chain: chain || undefined,
    minTvl: 1000000,
  });

  if (json) { console.log(JSON.stringify({ pools, count: pools.length }, null, 2)); return; }

  console.log(`DeFi Yield Rates${protocol ? ` — ${protocol}` : ""}${chain ? ` (${chain})` : ""}`);
  console.log("─".repeat(70));
  if (pools.length === 0) { console.log("  No pools found matching criteria"); return; }
  for (const p of pools) {
    const apy = p.apy !== null ? `${p.apy.toFixed(2)}%` : "N/A";
    console.log(`  ${p.project.padEnd(16)} ${p.symbol.padEnd(12)} ${apy.padStart(8)}  TVL ${fmtUsd(p.tvlUsd).padStart(10)}  ${p.chain}`);
  }
}
