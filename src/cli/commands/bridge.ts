import type { SupportedChain } from "../../types.js";
import { fetchBridgeRoutes } from "../../shared/lifi.js";
import { resolveTokenMeta } from "../../shared/coingecko.js";
import { NATIVE_TOKEN_ADDRESS } from "../../shared/constants.js";

export async function cmdBridge(fromChain: SupportedChain, toChain: SupportedChain, token: string, amount: string, json: boolean) {
  const upper = token.trim().toUpperCase();
  let fromAddr: string;
  let toAddr: string;
  let decimals = 18;

  if (upper === "ETH" || upper === "POL" || upper === "MATIC") {
    fromAddr = NATIVE_TOKEN_ADDRESS;
    toAddr = NATIVE_TOKEN_ADDRESS;
  } else {
    const meta = resolveTokenMeta(token, fromChain);
    if (!meta) { console.error(`Token '${token}' not found`); process.exit(1); }
    decimals = meta.decimals;
    fromAddr = meta.addresses[fromChain];
    toAddr = meta.addresses[toChain];
    if (!fromAddr || !toAddr) { console.error(`Token '${token}' not available on both chains`); process.exit(1); }
  }

  const rawAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, decimals))).toString();
  const result = await fetchBridgeRoutes(fromChain, toChain, fromAddr, toAddr, rawAmount);
  if (!result || result.routes.length === 0) { console.error("No bridge routes found"); process.exit(1); }

  if (json) { console.log(JSON.stringify({ fromChain, toChain, token, amount, routes: result.routes }, null, 2)); return; }
  console.log(`Bridge Routes — ${fromChain} → ${toChain} (${amount} ${token})`);
  console.log("─".repeat(60));
  for (let i = 0; i < result.routes.length; i++) {
    const r = result.routes[i];
    const out = (Number(BigInt(r.amountOut)) / Math.pow(10, decimals)).toFixed(4);
    const tag = i === 0 ? " ← best" : "";
    console.log(`  ${r.bridge.padEnd(14)} ${out.padStart(12)} ${token}  fee $${r.feeUsd.toFixed(2)}  gas $${r.gasCostUsd.toFixed(2)}  ~${r.estimatedTime}s${tag}`);
  }
}
