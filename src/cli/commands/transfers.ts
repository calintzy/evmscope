import type { SupportedChain } from "../../types.js";
import { EXPLORER_API_URLS, getApiKey } from "../../shared/etherscan.js";
import { sanitizeError } from "../../shared/validate.js";

export async function cmdTransfers(
  address: string,
  chain: SupportedChain,
  json: boolean,
) {
  const baseUrl = EXPLORER_API_URLS[chain];
  if (!baseUrl) {
    console.error(`Token transfers not supported on ${chain} (no explorer API)`);
    process.exit(1);
  }

  const apiKey = getApiKey(chain);
  const params = new URLSearchParams({
    module: "account",
    action: "tokentx",
    address,
    page: "1",
    offset: "20",
    sort: "desc",
    ...(apiKey ? { apikey: apiKey } : {}),
  });

  const res = await fetch(`${baseUrl}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.error(`Explorer API error: ${res.status}`);
    process.exit(1);
  }

  const data = (await res.json()) as {
    result?: Array<Record<string, string>>;
  };
  const transfers = (data.result ?? []).map((t) => ({
    hash: t.hash,
    from: t.from,
    to: t.to,
    value: t.value,
    tokenName: t.tokenName,
    tokenSymbol: t.tokenSymbol,
    tokenDecimal: t.tokenDecimal,
    timestamp: t.timeStamp,
    direction: t.from.toLowerCase() === address.toLowerCase() ? "out" : "in",
  }));

  if (json) {
    console.log(JSON.stringify({ chain, address, transfers, count: transfers.length }, null, 2));
    return;
  }

  console.log(`Token Transfers — ${chain}`);
  console.log(`  Address: ${address}`);
  console.log(`  Recent:  ${transfers.length} transfers`);
  console.log("");

  for (const t of transfers) {
    const date = new Date(Number(t.timestamp) * 1000).toISOString().slice(0, 16);
    const decimals = Number(t.tokenDecimal) || 18;
    const amount = (Number(t.value) / 10 ** decimals).toFixed(4);
    const dir = t.direction === "in" ? "←" : "→";
    const peer = t.direction === "in" ? t.from : t.to;
    console.log(`  ${date} ${dir} ${amount} ${t.tokenSymbol}`);
    console.log(`    ${t.direction === "in" ? "From" : "To"}: ${peer.slice(0, 12)}...  tx: ${t.hash.slice(0, 14)}...`);
  }
}
