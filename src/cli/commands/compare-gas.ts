import { SUPPORTED_CHAINS } from "../../types.js";
import { getClient } from "../../shared/rpc-client.js";
import { getPrice } from "../../shared/coingecko.js";
import { getNativeCoingeckoId } from "../../shared/chains.js";
import { formatGwei } from "viem";
import { fmtUsd } from "../format.js";

export async function cmdCompareGas(json: boolean) {
  const STANDARD_GAS = 21000n;
  const results = await Promise.allSettled(
    SUPPORTED_CHAINS.map(async (chain) => {
      const client = getClient(chain);
      const block = await client.getBlock({ blockTag: "latest" });
      const baseFee = block.baseFeePerGas ?? 0n;
      let costUsd = 0;
      try {
        const nativeId = getNativeCoingeckoId(chain);
        if (nativeId) { const p = await getPrice(nativeId); costUsd = Number(baseFee * STANDARD_GAS) / 1e18 * p.priceUsd; }
      } catch { /* 가격 조회 실패 */ }
      return { chain, baseFeeGwei: formatGwei(baseFee), estimatedCostUsd: Math.round(costUsd * 10000) / 10000 };
    }),
  );

  const chains = results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<{ chain: string; baseFeeGwei: string; estimatedCostUsd: number }>).value);
  chains.sort((a, b) => a.estimatedCostUsd - b.estimatedCostUsd);

  if (json) { console.log(JSON.stringify({ chains, cheapest: chains[0]?.chain, mostExpensive: chains[chains.length - 1]?.chain }, null, 2)); return; }

  console.log("Gas Comparison (21000 gas transfer, sorted by cost)");
  console.log("─".repeat(50));
  for (const c of chains) {
    const tag = c.chain === chains[0].chain ? " ← cheapest" : c.chain === chains[chains.length - 1].chain ? " ← most expensive" : "";
    console.log(`  ${c.chain.padEnd(10)} ${c.baseFeeGwei.padStart(12)} gwei  ${fmtUsd(c.estimatedCostUsd).padStart(8)}${tag}`);
  }
}
