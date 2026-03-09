import type { SupportedChain } from "../../types.js";
import { getClient } from "../../shared/rpc-client.js";

export async function cmdEvents(address: string, chain: SupportedChain, json: boolean) {
  const client = getClient(chain);
  const latestBlock = await client.getBlockNumber();
  const fromBlock = latestBlock - 1000n;

  const logs = await client.getLogs({
    address: address as `0x${string}`,
    fromBlock,
    toBlock: latestBlock,
  });

  const events = logs.slice(0, 20).map((log) => ({
    txHash: log.transactionHash,
    blockNumber: Number(log.blockNumber),
    logIndex: Number(log.logIndex),
    topics: log.topics.length,
  }));

  if (json) { console.log(JSON.stringify({ address, chain, events, fromBlock: Number(fromBlock), toBlock: Number(latestBlock) }, null, 2)); return; }

  console.log(`Contract Events — ${chain} (last 1000 blocks)`);
  console.log(`  Address: ${address}`);
  console.log(`  Blocks:  ${fromBlock} → ${latestBlock}`);
  console.log(`  Found:   ${logs.length} events (showing first ${events.length})`);
  console.log("─".repeat(50));
  for (const e of events) {
    console.log(`  Block ${String(e.blockNumber).padEnd(10)} tx ${e.txHash?.slice(0, 18)}...  ${e.topics} topics`);
  }
}
