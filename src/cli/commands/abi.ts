import type { SupportedChain } from "../../types.js";
import { getABI } from "../../shared/etherscan.js";

export async function cmdABI(address: string, chain: SupportedChain, json: boolean) {
  const result = await getABI(address, chain);
  if (!result) { console.error(`ABI not found for ${address}`); process.exit(1); }

  const fns = (result.abi as Array<{ type?: string }>).filter((i) => i.type === "function").length;
  const events = (result.abi as Array<{ type?: string }>).filter((i) => i.type === "event").length;

  if (json) { console.log(JSON.stringify({ address, source: result.source, contractName: result.contractName, functions: fns, events, abi: result.abi }, null, 2)); return; }
  console.log(`Contract ABI — ${chain}`);
  console.log(`  Address:  ${address}`);
  console.log(`  Name:     ${result.contractName ?? "unknown"}`);
  console.log(`  Source:   ${result.source}`);
  console.log(`  Functions: ${fns}`);
  console.log(`  Events:    ${events}`);
}
