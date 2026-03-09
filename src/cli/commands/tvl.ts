import { getProtocolData } from "../../shared/defillama.js";
import { fmtUsd, fmtPct } from "../format.js";

export async function cmdTVL(protocol: string, json: boolean) {
  const { default: protocols } = await import("../../data/protocols.json", { with: { type: "json" } });
  let slug = protocol.toLowerCase().replace(/\s+/g, "-");
  for (const p of protocols as Array<{ name: string; defillamaSlug?: string }>) {
    if (p.defillamaSlug && (p.name.toLowerCase() === protocol.toLowerCase() || p.defillamaSlug === protocol.toLowerCase())) {
      slug = p.defillamaSlug;
      break;
    }
  }

  const data = await getProtocolData(slug);
  if (!data) { console.error(`Protocol '${protocol}' not found on DefiLlama`); process.exit(1); }

  if (json) { console.log(JSON.stringify(data, null, 2)); return; }
  console.log(`${data.name} — TVL`);
  console.log(`  Total:     ${fmtUsd(data.tvl)}`);
  console.log(`  24h Change: ${fmtPct(data.change_1d)}`);
  console.log(`  7d Change:  ${fmtPct(data.change_7d)}`);
  if (Object.keys(data.chainTvls).length > 0) {
    console.log(`  Chains:`);
    const entries = Object.entries(data.chainTvls)
      .filter(([k]) => !k.includes("-") && k !== "staking" && k !== "borrowed" && k !== "pool2" && k !== "vesting")
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    for (const [chain, tvl] of entries) {
      const pct = data.tvl > 0 ? ((tvl / data.tvl) * 100).toFixed(1) : "0";
      console.log(`    ${chain.padEnd(12)} ${fmtUsd(tvl).padStart(10)} (${pct}%)`);
    }
  }
}
