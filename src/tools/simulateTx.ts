import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SUPPORTED_CHAINS, makeSuccess, makeError } from "../types.js";
import type { SupportedChain, ToolResult } from "../types.js";
import { getClient } from "../shared/rpc-client.js";
import { getPrice } from "../shared/coingecko.js";
import { parseEther } from "viem";
import chainsData from "../data/chains.json" with { type: "json" };

interface SimulationData {
  success: boolean;
  gasEstimate: string;
  gasEstimateUsd: number;
  returnData: string | null;
  error: string | null;
}

const inputSchema = z.object({
  from: z.string().describe("발신자 주소 (0x...)"),
  to: z.string().describe("수신자/컨트랙트 주소 (0x...)"),
  data: z.string().optional().describe("호출 데이터 (hex, 0x...)"),
  value: z.string().optional().default("0").describe("전송할 네이티브 토큰 수량 (예: '0.1')"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
});

async function handler(args: z.infer<typeof inputSchema>): Promise<ToolResult<SimulationData>> {
  const { from, to, data, value, chain } = args;

  if (!from.startsWith("0x") || from.length !== 42) {
    return makeError("Invalid 'from' address", "INVALID_INPUT");
  }
  if (!to.startsWith("0x") || to.length !== 42) {
    return makeError("Invalid 'to' address", "INVALID_INPUT");
  }

  try {
    const client = getClient(chain);
    const txValue = value && value !== "0" ? parseEther(value) : 0n;

    const callParams = {
      account: from as `0x${string}`,
      to: to as `0x${string}`,
      value: txValue,
      ...(data ? { data: data as `0x${string}` } : {}),
    };

    // eth_call 시뮬레이션
    let returnData: string | null = null;
    let callError: string | null = null;
    let callSuccess = true;

    try {
      const callResult = await client.call(callParams);
      returnData = callResult.data ?? null;
    } catch (err) {
      callSuccess = false;
      callError = err instanceof Error ? err.message : String(err);
    }

    // 가스 추정
    let gasEstimate = 21000n;
    try {
      gasEstimate = await client.estimateGas(callParams);
    } catch {
      // 시뮬레이션 실패 시 기본값 유지
    }

    // 가스비 USD 환산
    let gasEstimateUsd = 0;
    try {
      const block = await client.getBlock({ blockTag: "latest" });
      const baseFee = block.baseFeePerGas ?? 0n;
      const gasCostWei = baseFee * gasEstimate;
      const nativeId = (chainsData as Record<string, { nativeCurrency: { coingeckoId: string } }>)[chain]
        ?.nativeCurrency?.coingeckoId;
      if (nativeId) {
        const priceData = await getPrice(nativeId);
        gasEstimateUsd = (Number(gasCostWei) / 1e18) * priceData.priceUsd;
        gasEstimateUsd = Math.round(gasEstimateUsd * 10000) / 10000;
      }
    } catch {
      // 가격 조회 실패 시 0
    }

    const result: SimulationData = {
      success: callSuccess,
      gasEstimate: gasEstimate.toString(),
      gasEstimateUsd,
      returnData,
      error: callError,
    };

    return makeSuccess(chain, result, false);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(`Simulation failed: ${message}`, "RPC_ERROR");
  }
}

export function register(server: McpServer) {
  server.tool(
    "simulateTx",
    "트랜잭션을 시뮬레이션합니다 (eth_call + estimateGas, 가스비 USD 환산, revert reason 디코딩)",
    inputSchema.shape,
    async (args) => {
      const result = await handler(args as z.infer<typeof inputSchema>);
      return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
    },
  );
}
