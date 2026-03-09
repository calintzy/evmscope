import type { SupportedChain } from "../../types.js";
import { getClient } from "../../shared/rpc-client.js";
import { formatEther } from "viem";

export async function cmdTx(hash: string, chain: SupportedChain, json: boolean) {
  const client = getClient(chain);
  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash: hash as `0x${string}` }),
    client.getTransactionReceipt({ hash: hash as `0x${string}` }),
  ]);

  const status = receipt.status === "success" ? "success" : "reverted";
  if (json) { console.log(JSON.stringify({ hash, status, block: Number(receipt.blockNumber), from: tx.from, to: tx.to, value: formatEther(tx.value), gasUsed: receipt.gasUsed.toString() }, null, 2)); return; }
  console.log(`Transaction — ${chain}`);
  console.log(`  Hash:     ${hash}`);
  console.log(`  Status:   ${status}`);
  console.log(`  Block:    ${receipt.blockNumber}`);
  console.log(`  From:     ${tx.from}`);
  console.log(`  To:       ${tx.to}`);
  console.log(`  Value:    ${formatEther(tx.value)} ETH`);
  console.log(`  Gas Used: ${receipt.gasUsed}`);
}
