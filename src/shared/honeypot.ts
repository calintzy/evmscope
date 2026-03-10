import { cache } from "./cache.js";
import { CHAIN_IDS } from "./constants.js";
import { logCatchError } from "./logger.js";
import { isValidAddress } from "./validate.js";

const BASE_URL = "https://api.honeypot.is/v2";
const HONEYPOT_CACHE_TTL = 3600; // 1시간

export interface HoneypotResult {
  isHoneypot: boolean;
  riskLevel: "safe" | "warning" | "danger";
  buyTax: number;
  sellTax: number;
  flags: string[];
  pairAddress: string | null;
  tokenName: string | null;
  tokenSymbol: string | null;
}

/** Honeypot.is API로 토큰 허니팟 여부 확인 */
export async function checkHoneypotToken(
  tokenAddress: string,
  chain: string,
): Promise<HoneypotResult | null> {
  if (!isValidAddress(tokenAddress)) return null;
  const chainId = CHAIN_IDS[chain as keyof typeof CHAIN_IDS];
  if (!chainId) return null;

  const cacheKey = `honeypot:${chain}:${tokenAddress.toLowerCase()}`;
  const cached = cache.get<HoneypotResult>(cacheKey);
  if (cached.hit) return cached.data;

  try {
    const res = await fetch(
      `${BASE_URL}/IsHoneypot?address=${tokenAddress}&chainID=${chainId}`,
    );
    if (!res.ok) return null;

    const json = (await res.json()) as {
      honeypotResult?: { isHoneypot: boolean };
      simulationResult?: { buyTax: number; sellTax: number; transferTax: number };
      contractCode?: { openSource: boolean; isProxy: boolean; hasProxyCalls: boolean };
      token?: { name: string; symbol: string; totalHolders: number };
      pair?: { address: string; pairName: string };
      flags?: string[];
    };

    const isHoneypot = json.honeypotResult?.isHoneypot ?? false;
    const buyTax = json.simulationResult?.buyTax ?? 0;
    const sellTax = json.simulationResult?.sellTax ?? 0;

    // 위험 플래그 수집
    const flags: string[] = [];
    if (isHoneypot) flags.push("honeypot");
    if (buyTax > 10) flags.push("high_buy_tax");
    if (sellTax > 10) flags.push("high_sell_tax");
    if (json.contractCode?.hasProxyCalls) flags.push("proxy_calls");
    if (!json.contractCode?.openSource) flags.push("closed_source");
    if (json.flags) flags.push(...json.flags);

    // 위험도 판정
    let riskLevel: "safe" | "warning" | "danger" = "safe";
    if (isHoneypot || sellTax > 50) riskLevel = "danger";
    else if (buyTax > 10 || sellTax > 10 || flags.length > 2) riskLevel = "warning";

    const result: HoneypotResult = {
      isHoneypot,
      riskLevel,
      buyTax: Math.round(buyTax * 100) / 100,
      sellTax: Math.round(sellTax * 100) / 100,
      flags: [...new Set(flags)],
      pairAddress: json.pair?.address ?? null,
      tokenName: json.token?.name ?? null,
      tokenSymbol: json.token?.symbol ?? null,
    };

    cache.set(cacheKey, result, HONEYPOT_CACHE_TTL);
    return result;
  } catch (err) {
    logCatchError("honeypot", err);
    return null;
  }
}
