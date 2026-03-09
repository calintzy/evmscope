import type { SupportedChain } from "../../types.js";
import { fetchQuote } from "../../shared/paraswap.js";
import { resolveTokenMeta } from "../../shared/coingecko.js";
import { NATIVE_TOKEN_ADDRESS } from "../../shared/constants.js";

export async function cmdSwap(tokenIn: string, tokenOut: string, amount: string, chain: SupportedChain, json: boolean) {
  const resolve = (sym: string) => {
    const upper = sym.trim().toUpperCase();
    if (upper === "ETH" || upper === "POL" || upper === "MATIC") return { address: NATIVE_TOKEN_ADDRESS, symbol: upper, decimals: 18 };
    if (sym.startsWith("0x") && sym.length === 42) {
      const m = resolveTokenMeta(sym, chain);
      return { address: sym, symbol: m?.symbol ?? "UNKNOWN", decimals: m?.decimals ?? 18 };
    }
    const m = resolveTokenMeta(sym, chain);
    if (!m) return null;
    const addr = m.addresses[chain];
    if (!addr) return null;
    return { address: addr, symbol: m.symbol, decimals: m.decimals };
  };

  const src = resolve(tokenIn);
  if (!src) { console.error(`Token '${tokenIn}' not found on ${chain}`); process.exit(1); }
  const dst = resolve(tokenOut);
  if (!dst) { console.error(`Token '${tokenOut}' not found on ${chain}`); process.exit(1); }

  const rawAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, src.decimals))).toString();
  const quote = await fetchQuote(src.address, dst.address, rawAmount, src.decimals, dst.decimals, chain);

  const outAmt = Number(BigInt(quote.destAmount)) / Math.pow(10, dst.decimals);
  const inAmt = Number(BigInt(quote.srcAmount)) / Math.pow(10, src.decimals);
  const rate = outAmt / inAmt;

  if (json) { console.log(JSON.stringify({ tokenIn: { symbol: src.symbol, amount: inAmt }, tokenOut: { symbol: dst.symbol, amount: outAmt }, exchangeRate: rate, source: quote.bestRoute, gasCostUSD: quote.gasCostUSD }, null, 2)); return; }
  console.log(`Swap Quote — ${chain}`);
  console.log(`  ${inAmt.toFixed(6)} ${src.symbol} → ${outAmt.toFixed(6)} ${dst.symbol}`);
  console.log(`  Rate:   1 ${src.symbol} = ${rate.toFixed(6)} ${dst.symbol}`);
  console.log(`  Source: ${quote.bestRoute}`);
  console.log(`  Gas:    $${quote.gasCostUSD}`);
}
