import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { checkHoneypotToken } from "../shared/honeypot.js";
import { resolveTokenMeta } from "../shared/coingecko.js";

interface HoneypotData {
  token: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  isHoneypot: boolean;
  riskLevel: "safe" | "warning" | "danger";
  buyTax: number;
  sellTax: number;
  flags: string[];
  pairAddress: string | null;
}

const inputSchema = z.object({
  token: z.string().describe("토큰 주소 (0x...) 또는 심볼"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<HoneypotData>> {
  const { token, chain } = args;

  // 토큰 주소 해석
  let tokenAddress = token;
  if (!token.startsWith("0x") || token.length !== 42) {
    const meta = resolveTokenMeta(token, chain);
    if (!meta) return makeError(`Token '${token}' not found`, "TOKEN_NOT_FOUND");
    const addresses = meta.addresses as Record<string, string>;
    tokenAddress = addresses[chain];
    if (!tokenAddress) return makeError(`Token '${token}' not available on ${chain}`, "TOKEN_NOT_FOUND");
  }

  try {
    const result = await checkHoneypotToken(tokenAddress, chain);
    if (!result) return makeError("Honeypot check failed — API unavailable or unsupported chain", "API_ERROR");

    const data: HoneypotData = {
      token: tokenAddress,
      tokenName: result.tokenName,
      tokenSymbol: result.tokenSymbol,
      isHoneypot: result.isHoneypot,
      riskLevel: result.riskLevel,
      buyTax: result.buyTax,
      sellTax: result.sellTax,
      flags: result.flags,
      pairAddress: result.pairAddress,
    };

    return makeSuccess(chain, data, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(`Honeypot check failed: ${message}`, "API_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "checkHoneypot",
    "토큰의 허니팟(사기) 여부를 탐지합니다 (매수/매도 세금, 위험도, 플래그, Honeypot.is 기반)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
