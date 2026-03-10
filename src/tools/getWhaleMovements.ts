import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { cache } from "../shared/cache.js";
import { getTokenTransfers } from "../shared/etherscan.js";
import { resolveTokenMeta, resolveCoingeckoId, getPrice } from "../shared/coingecko.js";
import { getLabel, isExchangeAddress } from "../shared/labels.js";
import { sanitizeError } from "../shared/validate.js";

interface Movement {
  txHash: string;
  from: string;
  to: string;
  fromLabel: string | null;
  toLabel: string | null;
  value: string;
  valueUsd: number;
  direction: "exchange_deposit" | "exchange_withdrawal" | "whale_to_whale" | "unknown";
  timestamp: number;
}

interface WhaleSummary {
  totalMovements: number;
  totalValueUsd: number;
  netExchangeFlow: number;
}

interface WhaleMovementsData {
  token: string;
  tokenAddress: string;
  movements: Movement[];
  summary: WhaleSummary;
}

const CACHE_TTL = 60;

const inputSchema = z.object({
  token: z.string().describe("토큰 심볼 (USDC, USDT) 또는 contract address"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
  minValueUsd: z.number().default(100000).describe("최소 USD 금액 (기본: $100,000)"),
  limit: z.number().default(10).describe("반환할 최대 이동 수 (기본: 10)"),
});

function classifyDirection(from: string, to: string): Movement["direction"] {
  const fromExchange = isExchangeAddress(from);
  const toExchange = isExchangeAddress(to);
  if (fromExchange && !toExchange) return "exchange_withdrawal";
  if (!fromExchange && toExchange) return "exchange_deposit";
  if (!fromExchange && !toExchange) return "whale_to_whale";
  return "unknown";
}

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<WhaleMovementsData>> {
  const { token, chain, minValueUsd, limit } = args;

  // 토큰 주소 확인
  let tokenAddress = token;
  let tokenSymbol = token;
  if (!token.startsWith("0x") || token.length !== 42) {
    const meta = resolveTokenMeta(token, chain);
    if (!meta) return makeError(`Token '${token}' not found on ${chain}`, "TOKEN_NOT_FOUND");
    const addresses = meta.addresses;
    const addr = addresses[chain];
    if (!addr) return makeError(`Token '${token}' not available on ${chain}`, "TOKEN_NOT_FOUND");
    tokenAddress = addr;
    tokenSymbol = meta.symbol;
  }

  const cacheKey = `whale:${chain}:${tokenAddress.toLowerCase()}:${minValueUsd}:${limit}`;
  const cached = cache.get<WhaleMovementsData>(cacheKey);
  if (cached.hit) return makeSuccess(chain, cached.data, true);

  try {
    // 토큰 가격 조회
    let priceUsd = 0;
    try {
      const coingeckoId = resolveCoingeckoId(token, chain);
      if (coingeckoId) {
        const priceData = await getPrice(coingeckoId);
        priceUsd = priceData.priceUsd;
      }
    } catch {
      // 가격 조회 실패 시 0
    }

    // Etherscan에서 최근 토큰 전송 조회
    const transfers = await getTokenTransfers(tokenAddress, chain, 100);
    const meta = resolveTokenMeta(token) ?? resolveTokenMeta(tokenAddress);
    const decimals = meta?.decimals ?? 18;

    // 필터링 및 변환
    const movements: Movement[] = [];
    let totalValueUsd = 0;
    let netExchangeFlow = 0;

    for (const tx of transfers) {
      const rawValue = BigInt(tx.value);
      const formatted = Number(rawValue) / Math.pow(10, decimals);
      const valueUsd = priceUsd > 0 ? formatted * priceUsd : formatted;

      if (valueUsd < minValueUsd) continue;

      const direction = classifyDirection(tx.from, tx.to);
      movements.push({
        txHash: tx.hash,
        from: tx.from,
        to: tx.to,
        fromLabel: getLabel(tx.from),
        toLabel: getLabel(tx.to),
        value: formatted.toFixed(2),
        valueUsd: Math.round(valueUsd * 100) / 100,
        direction,
        timestamp: Number(tx.timeStamp),
      });

      totalValueUsd += valueUsd;
      if (direction === "exchange_deposit") netExchangeFlow += valueUsd;
      if (direction === "exchange_withdrawal") netExchangeFlow -= valueUsd;

      if (movements.length >= limit) break;
    }

    // valueUsd 내림차순 정렬
    movements.sort((a, b) => b.valueUsd - a.valueUsd);

    const data: WhaleMovementsData = {
      token: tokenSymbol,
      tokenAddress,
      movements,
      summary: {
        totalMovements: movements.length,
        totalValueUsd: Math.round(totalValueUsd * 100) / 100,
        netExchangeFlow: Math.round(netExchangeFlow * 100) / 100,
      },
    };

    cache.set(cacheKey, data, CACHE_TTL);
    return makeSuccess(chain, data, false);
  } catch (err) {
    const message = sanitizeError(err);
    return makeError(`Failed to fetch whale movements: ${message}`, "API_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "getWhaleMovements",
    "대규모 토큰 전송(고래 이동)을 추적합니다. 거래소 입출금 방향 판정, 요약 통계 포함",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
