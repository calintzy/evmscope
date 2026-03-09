import type { SupportedChain } from "../../types.js";
import { getClient } from "../../shared/rpc-client.js";

export async function cmdSimulate(from: string, to: string, data: string | undefined, chain: SupportedChain, json: boolean) {
  const client = getClient(chain);
  const callParams = {
    account: from as `0x${string}`,
    to: to as `0x${string}`,
    ...(data ? { data: data as `0x${string}` } : {}),
  };

  let success = true;
  let returnData: string | null = null;
  let callError: string | null = null;

  try {
    const result = await client.call(callParams);
    returnData = result.data ?? null;
  } catch (err) {
    success = false;
    callError = err instanceof Error ? err.message : String(err);
  }

  let gasEstimate = 21000n;
  try { gasEstimate = await client.estimateGas(callParams); } catch { /* 기본값 유지 */ }

  if (json) { console.log(JSON.stringify({ success, gasEstimate: gasEstimate.toString(), returnData, error: callError }, null, 2)); return; }
  console.log(`Transaction Simulation — ${chain}`);
  console.log(`  From:     ${from}`);
  console.log(`  To:       ${to}`);
  console.log(`  Success:  ${success}`);
  console.log(`  Gas Est:  ${gasEstimate}`);
  if (returnData) console.log(`  Return:   ${returnData.slice(0, 66)}...`);
  if (callError) console.log(`  Error:    ${callError.slice(0, 100)}`);
}
