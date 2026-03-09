import { SUPPORTED_CHAINS } from "./types.js";
import type { SupportedChain } from "./types.js";
import { getClient } from "./shared/rpc-client.js";
import { cache } from "./shared/cache.js";
import { getPrice, resolveCoingeckoId, resolveTokenMeta } from "./shared/coingecko.js";
import { getABI } from "./shared/etherscan.js";
import { getProtocolData } from "./shared/defillama.js";
import { fetchQuote } from "./shared/paraswap.js";
import { formatGwei, formatEther } from "viem";
import chainsData from "./data/chains.json" with { type: "json" };

const HELP = `
evmscope v1.0.0 — EVM blockchain intelligence CLI

Usage:
  evmscope                              Start MCP server (default)
  evmscope <command> [options]          Run CLI command

Commands:
  price <token> [chain]                 Token price (USD, 24h change)
  gas [chain]                           Gas price (slow/normal/fast)
  compare-gas                           Compare gas across all 5 chains
  balance <address> [chain]             Wallet balance (native + tokens)
  token-info <token> [chain]            ERC-20 token metadata
  ens <name-or-address>                 Resolve ENS name/address
  tx <hash> [chain]                     Transaction status
  abi <address> [chain]                 Contract ABI lookup
  tvl <protocol>                        Protocol TVL (DefiLlama)
  swap <tokenIn> <tokenOut> <amount> [chain]  DEX swap quote (ParaSwap)

Options:
  --json                                Output raw JSON
  --help, -h                            Show this help

Examples:
  evmscope price ETH
  evmscope compare-gas
  evmscope tvl Aave
  evmscope swap ETH USDC 1.0
  evmscope balance 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
`.trim();

// 유틸: 숫자 포맷팅
function fmtUsd(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number | null): string {
  if (n === null) return "N/A";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

function parseChain(input?: string): SupportedChain {
  if (!input) return "ethereum";
  const lower = input.toLowerCase();
  if (SUPPORTED_CHAINS.includes(lower as SupportedChain)) return lower as SupportedChain;
  console.error(`Unknown chain: ${input}. Supported: ${SUPPORTED_CHAINS.join(", ")}`);
  process.exit(1);
}

// --- Commands ---

async function cmdPrice(token: string, chain: SupportedChain, json: boolean) {
  const id = resolveCoingeckoId(token, chain);
  if (!id) { console.error(`Token '${token}' not found`); process.exit(1); }
  const meta = resolveTokenMeta(token, chain);
  const data = await getPrice(id);
  if (json) { console.log(JSON.stringify({ token: meta?.symbol ?? token, ...data }, null, 2)); return; }
  console.log(`${meta?.symbol ?? token} (${meta?.name ?? id})`);
  console.log(`  Price:      ${fmtUsd(data.priceUsd)}`);
  console.log(`  24h Change: ${fmtPct(data.change24h)}`);
  console.log(`  Market Cap: ${fmtUsd(data.marketCap)}`);
  console.log(`  Volume 24h: ${fmtUsd(data.volume24h)}`);
}

async function cmdGas(chain: SupportedChain, json: boolean) {
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

async function cmdCompareGas(json: boolean) {
  const STANDARD_GAS = 21000n;
  const results = await Promise.allSettled(
    SUPPORTED_CHAINS.map(async (chain) => {
      const client = getClient(chain);
      const block = await client.getBlock({ blockTag: "latest" });
      const baseFee = block.baseFeePerGas ?? 0n;
      let costUsd = 0;
      try {
        const nativeId = (chainsData as Record<string, { nativeCurrency: { coingeckoId: string } }>)[chain]?.nativeCurrency?.coingeckoId;
        if (nativeId) { const p = await getPrice(nativeId); costUsd = Number(baseFee * STANDARD_GAS) / 1e18 * p.priceUsd; }
      } catch {}
      return { chain, baseFeeGwei: formatGwei(baseFee), estimatedCostUsd: Math.round(costUsd * 10000) / 10000 };
    }),
  );

  const chains = results.filter((r) => r.status === "fulfilled").map((r) => (r as PromiseFulfilledResult<any>).value);
  chains.sort((a: any, b: any) => a.estimatedCostUsd - b.estimatedCostUsd);

  if (json) { console.log(JSON.stringify({ chains, cheapest: chains[0]?.chain, mostExpensive: chains[chains.length - 1]?.chain }, null, 2)); return; }

  console.log("Gas Comparison (21000 gas transfer, sorted by cost)");
  console.log("─".repeat(50));
  for (const c of chains) {
    const tag = c.chain === chains[0].chain ? " ← cheapest" : c.chain === chains[chains.length - 1].chain ? " ← most expensive" : "";
    console.log(`  ${c.chain.padEnd(10)} ${c.baseFeeGwei.padStart(12)} gwei  ${fmtUsd(c.estimatedCostUsd).padStart(8)}${tag}`);
  }
}

async function cmdBalance(address: string, chain: SupportedChain, json: boolean) {
  const client = getClient(chain);
  const balance = await client.getBalance({ address: address as `0x${string}` });
  const formatted = formatEther(balance);
  const nativeSymbol = (chainsData as Record<string, { nativeCurrency: { symbol: string; coingeckoId: string } }>)[chain]?.nativeCurrency;
  let valueUsd = 0;
  try {
    if (nativeSymbol?.coingeckoId) { const p = await getPrice(nativeSymbol.coingeckoId); valueUsd = Number(formatted) * p.priceUsd; }
  } catch {}

  if (json) { console.log(JSON.stringify({ address, chain, balance: formatted, symbol: nativeSymbol?.symbol, valueUsd: Math.round(valueUsd * 100) / 100 }, null, 2)); return; }
  console.log(`Balance — ${chain}`);
  console.log(`  Address: ${address}`);
  console.log(`  ${nativeSymbol?.symbol ?? "ETH"}: ${Number(formatted).toFixed(6)} (${fmtUsd(valueUsd)})`);
}

async function cmdTokenInfo(token: string, chain: SupportedChain, json: boolean) {
  const meta = resolveTokenMeta(token, chain);
  if (!meta) { console.error(`Token '${token}' not found`); process.exit(1); }
  const addresses = meta.addresses as Record<string, string>;
  const addr = addresses[chain];

  if (json) { console.log(JSON.stringify({ symbol: meta.symbol, name: meta.name, decimals: meta.decimals, address: addr ?? null, chain }, null, 2)); return; }
  console.log(`${meta.symbol} — ${meta.name}`);
  console.log(`  Decimals: ${meta.decimals}`);
  console.log(`  Address:  ${addr ?? "N/A (not on " + chain + ")"}`);
}

async function cmdENS(nameOrAddress: string, json: boolean) {
  const client = getClient("ethereum");
  const isAddress = nameOrAddress.startsWith("0x") && nameOrAddress.length === 42;

  if (isAddress) {
    const name = await client.getEnsName({ address: nameOrAddress as `0x${string}` });
    if (json) { console.log(JSON.stringify({ address: nameOrAddress, name }, null, 2)); return; }
    console.log(`ENS Reverse Lookup`);
    console.log(`  Address: ${nameOrAddress}`);
    console.log(`  Name:    ${name ?? "not found"}`);
  } else {
    const address = await client.getEnsAddress({ name: nameOrAddress });
    if (json) { console.log(JSON.stringify({ name: nameOrAddress, address }, null, 2)); return; }
    console.log(`ENS Resolve`);
    console.log(`  Name:    ${nameOrAddress}`);
    console.log(`  Address: ${address ?? "not found"}`);
  }
}

async function cmdTx(hash: string, chain: SupportedChain, json: boolean) {
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

async function cmdABI(address: string, chain: SupportedChain, json: boolean) {
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

async function cmdTVL(protocol: string, json: boolean) {
  // protocols.json에서 slug 확인
  const { default: protocols } = await import("./data/protocols.json", { with: { type: "json" } });
  let slug = protocol.toLowerCase().replace(/\s+/g, "-");
  for (const p of protocols as Array<{ name: string; defillamaSlug?: string }>) {
    if (p.defillamaSlug && (p.name.toLowerCase() === protocol.toLowerCase() || p.defillamaSlug === protocol.toLowerCase())) {
      slug = p.defillamaSlug;
      break;
    }
  }

  const data = await getProtocolData(slug);
  if (!data) { console.error(`Protocol '${protocol}' not found on DefiLlama`); process.exit(1); }

  if (json) { console.log(JSON.stringify(data, null, 2)); return; }
  console.log(`${data.name} — TVL`);
  console.log(`  Total:     ${fmtUsd(data.tvl)}`);
  console.log(`  24h Change: ${fmtPct(data.change_1d)}`);
  console.log(`  7d Change:  ${fmtPct(data.change_7d)}`);
  if (Object.keys(data.chainTvls).length > 0) {
    console.log(`  Chains:`);
    const entries = Object.entries(data.chainTvls)
      .filter(([k]) => !k.includes("-") && k !== "staking" && k !== "borrowed" && k !== "pool2" && k !== "vesting")
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);
    for (const [chain, tvl] of entries) {
      const pct = data.tvl > 0 ? ((tvl / data.tvl) * 100).toFixed(1) : "0";
      console.log(`    ${chain.padEnd(12)} ${fmtUsd(tvl).padStart(10)} (${pct}%)`);
    }
  }
}

async function cmdSwap(tokenIn: string, tokenOut: string, amount: string, chain: SupportedChain, json: boolean) {
  const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  const resolve = (sym: string) => {
    const upper = sym.trim().toUpperCase();
    if (upper === "ETH" || upper === "POL" || upper === "MATIC") return { address: ETH_ADDRESS, symbol: upper, decimals: 18 };
    if (sym.startsWith("0x") && sym.length === 42) {
      const m = resolveTokenMeta(sym, chain);
      return { address: sym, symbol: m?.symbol ?? "UNKNOWN", decimals: m?.decimals ?? 18 };
    }
    const m = resolveTokenMeta(sym, chain);
    if (!m) return null;
    const addr = (m.addresses as Record<string, string>)[chain];
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

// --- Main ---

async function main() {
  const args = process.argv.slice(2);

  // MCP 서버 모드 (인수 없음)
  if (args.length === 0) {
    await import("./index.js");
    return;
  }

  if (args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    return;
  }

  const jsonFlag = args.includes("--json");
  const filteredArgs = args.filter((a) => a !== "--json");
  const [cmd, ...rest] = filteredArgs;

  try {
    switch (cmd) {
      case "price":
        if (!rest[0]) { console.error("Usage: evmscope price <token> [chain]"); process.exit(1); }
        await cmdPrice(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "gas":
        await cmdGas(parseChain(rest[0]), jsonFlag);
        break;
      case "compare-gas":
        await cmdCompareGas(jsonFlag);
        break;
      case "balance":
        if (!rest[0]) { console.error("Usage: evmscope balance <address> [chain]"); process.exit(1); }
        await cmdBalance(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "token-info":
        if (!rest[0]) { console.error("Usage: evmscope token-info <token> [chain]"); process.exit(1); }
        await cmdTokenInfo(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "ens":
        if (!rest[0]) { console.error("Usage: evmscope ens <name-or-address>"); process.exit(1); }
        await cmdENS(rest[0], jsonFlag);
        break;
      case "tx":
        if (!rest[0]) { console.error("Usage: evmscope tx <hash> [chain]"); process.exit(1); }
        await cmdTx(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "abi":
        if (!rest[0]) { console.error("Usage: evmscope abi <address> [chain]"); process.exit(1); }
        await cmdABI(rest[0], parseChain(rest[1]), jsonFlag);
        break;
      case "tvl":
        if (!rest[0]) { console.error("Usage: evmscope tvl <protocol>"); process.exit(1); }
        await cmdTVL(rest.join(" "), jsonFlag);
        break;
      case "swap":
        if (rest.length < 3) { console.error("Usage: evmscope swap <tokenIn> <tokenOut> <amount> [chain]"); process.exit(1); }
        await cmdSwap(rest[0], rest[1], rest[2], parseChain(rest[3]), jsonFlag);
        break;
      default:
        console.error(`Unknown command: ${cmd}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${msg}`);
    process.exit(1);
  }
}

main();
