import type { SupportedChain } from "../../types.js";
import { checkHoneypotToken } from "../../shared/honeypot.js";
import { resolveTokenMeta } from "../../shared/coingecko.js";

export async function cmdHoneypot(token: string, chain: SupportedChain, json: boolean) {
  let tokenAddress = token;
  if (!token.startsWith("0x") || token.length !== 42) {
    const meta = resolveTokenMeta(token, chain);
    if (!meta) { console.error(`Token '${token}' not found`); process.exit(1); }
    tokenAddress = meta.addresses[chain];
    if (!tokenAddress) { console.error(`Token '${token}' not available on ${chain}`); process.exit(1); }
  }

  const result = await checkHoneypotToken(tokenAddress, chain);
  if (!result) { console.error("Honeypot check failed"); process.exit(1); }

  if (json) { console.log(JSON.stringify(result, null, 2)); return; }
  const icon = result.riskLevel === "safe" ? "SAFE" : result.riskLevel === "warning" ? "WARN" : "DANGER";
  console.log(`Honeypot Check — ${chain}`);
  console.log(`  Token:      ${result.tokenName ?? "unknown"} (${result.tokenSymbol ?? "?"})`);
  console.log(`  Address:    ${tokenAddress}`);
  console.log(`  Honeypot:   ${result.isHoneypot ? "YES" : "NO"} [${icon}]`);
  console.log(`  Buy Tax:    ${result.buyTax}%`);
  console.log(`  Sell Tax:   ${result.sellTax}%`);
  if (result.flags.length > 0) console.log(`  Flags:      ${result.flags.join(", ")}`);
}
