import type { SupportedChain } from "../../types.js";
import { getClient } from "../../shared/rpc-client.js";
import { formatGwei } from "viem";

export async function cmdBlock(
  blockNumber: string,
  chain: SupportedChain,
  json: boolean,
) {
  const client = getClient(chain);

  const blockParam = blockNumber === "latest" ? undefined : BigInt(blockNumber);
  const block = await client.getBlock(blockParam !== undefined ? { blockNumber: blockParam } : {});

  const datetime = new Date(Number(block.timestamp) * 1000).toISOString();
  const baseFee = block.baseFeePerGas ? formatGwei(block.baseFeePerGas) : "N/A";

  if (json) {
    console.log(JSON.stringify({
      chain,
      blockNumber: Number(block.number),
      timestamp: Number(block.timestamp),
      datetime,
      hash: block.hash,
      parentHash: block.parentHash,
      gasUsed: block.gasUsed.toString(),
      gasLimit: block.gasLimit.toString(),
      baseFeePerGas: baseFee,
      transactionCount: block.transactions.length,
      miner: block.miner,
    }, null, 2));
    return;
  }

  console.log(`Block Info — ${chain}`);
  console.log(`  Number:       ${block.number}`);
  console.log(`  Time:         ${datetime}`);
  console.log(`  Hash:         ${block.hash}`);
  console.log(`  Parent:       ${block.parentHash}`);
  console.log(`  Gas Used:     ${block.gasUsed.toLocaleString()} / ${block.gasLimit.toLocaleString()}`);
  console.log(`  Base Fee:     ${baseFee} Gwei`);
  console.log(`  Transactions: ${block.transactions.length}`);
  console.log(`  Miner:        ${block.miner}`);
}
