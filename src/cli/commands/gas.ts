import type { SupportedChain } from "../../types.js";
import { getClient } from "../../shared/rpc-client.js";
import { formatGwei } from "viem";

export async function cmdGas(chain: SupportedChain, json: boolean) {
  const client = getClient(chain);
  const [block, maxPriorityFee] = await Promise.all([
    client.getBlock({ blockTag: "latest" }),
    client.estimateMaxPriorityFeePerGas(),
  ]);
  const baseFee = block.baseFeePerGas ?? 0n;
  const slow = baseFee + (maxPriorityFee * 80n / 100n);
  const normal = baseFee + maxPriorityFee;
  const fast = baseFee + (maxPriorityFee * 150n / 100n);

  if (json) {
    console.log(JSON.stringify({ chain, baseFee: formatGwei(baseFee), slow: formatGwei(slow), normal: formatGwei(normal), fast: formatGwei(fast), block: Number(block.number) }, null, 2));
    return;
  }
  console.log(`Gas Price — ${chain} (block ${block.number})`);
  console.log(`  Base Fee: ${formatGwei(baseFee)} gwei`);
  console.log(`  Slow:     ${formatGwei(slow)} gwei`);
  console.log(`  Normal:   ${formatGwei(normal)} gwei`);
  console.log(`  Fast:     ${formatGwei(fast)} gwei`);
}
