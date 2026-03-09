import { SUPPORTED_CHAINS } from "../types.js";
import type { SupportedChain } from "../types.js";
import { VERSION } from "../shared/constants.js";

export const HELP = `
evmscope v${VERSION} — EVM blockchain intelligence CLI

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
  yield [protocol] [chain]              DeFi yield rates (DefiLlama)
  events <address> [chain]              Contract event logs
  holders <token> [chain]               Top token holders
  simulate <from> <to> [data] [chain]   Simulate transaction
  honeypot <token> [chain]              Honeypot token detection
  bridge <fromChain> <toChain> <token> <amount>  Cross-chain bridge routes

Options:
  --json                                Output raw JSON
  --help, -h                            Show this help

Examples:
  evmscope price ETH
  evmscope compare-gas
  evmscope tvl Aave
  evmscope swap ETH USDC 1.0
  evmscope yield aave-v3
  evmscope honeypot 0x...
  evmscope bridge ethereum arbitrum USDC 100
  evmscope balance 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
`.trim();

export function parseChain(input?: string): SupportedChain {
  if (!input) return "ethereum";
  const lower = input.toLowerCase();
  if (SUPPORTED_CHAINS.includes(lower as SupportedChain)) return lower as SupportedChain;
  console.error(`Unknown chain: ${input}. Supported: ${SUPPORTED_CHAINS.join(", ")}`);
  process.exit(1);
}
