export const SUPPORTED_CHAINS = ["ethereum", "polygon", "arbitrum", "base", "optimism"] as const;
export type SupportedChain = typeof SUPPORTED_CHAINS[number];

export interface ChainConfig {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
    coingeckoId: string;
  };
}

export interface ToolSuccess<T> {
  success: true;
  chain: SupportedChain;
  data: T;
  cached: boolean;
  timestamp: number;
}

export interface ToolError {
  success: false;
  error: string;
  code: ErrorCode;
}

export type ToolResult<T> = ToolSuccess<T> | ToolError;

export type ErrorCode =
  | "INVALID_INPUT"
  | "CHAIN_NOT_SUPPORTED"
  | "TOKEN_NOT_FOUND"
  | "API_ERROR"
  | "RPC_ERROR"
  | "RATE_LIMITED"
  | "ENS_NOT_FOUND"
  | "TX_NOT_FOUND"
  | "ABI_NOT_FOUND"
  | "PROTOCOL_NOT_FOUND";

export function makeSuccess<T>(chain: SupportedChain, data: T, cached: boolean): ToolSuccess<T> {
  return { success: true, chain, data, cached, timestamp: Date.now() };
}

export function makeError(error: string, code: ErrorCode): ToolError {
  return { success: false, error, code };
}

export function isSupportedChain(chain: string): chain is SupportedChain {
  return SUPPORTED_CHAINS.includes(chain as SupportedChain);
}
