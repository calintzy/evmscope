# evmscope

[한국어](README-ko.md) | [中文](README-zh.md) | [日本語](README-ja.md)

EVM blockchain intelligence toolkit for AI agents. A single MCP server providing 14 tools for token prices, gas comparison, swap quotes, approval status, protocol TVL, whale tracking, and more.

> "AgentKit executes. evmscope decides."

## Features

- **14 tools** — Price, gas compare, swap quote, approval status, TVL, whale tracking, balance, token info, ENS, tx status, tx decode, ABI lookup, address ID
- **5 EVM chains** — Ethereum, Polygon, Arbitrum, Base, Optimism
- **49 built-in tokens** — ETH, USDC, USDT, WETH, LINK, UNI, AAVE, ARB, OP, PEPE, and more
- **30+ labeled addresses** — Exchanges, DeFi protocols, bridges, whale wallets
- **Zero config** — No API keys required. Works out of the box with free public APIs
- **Read-only** — No transaction execution. Zero risk of fund loss
- **Built-in fallbacks** — Embedded token/signature/label databases for offline operation

## Quick Start

```bash
npx evmscope
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "evmscope": {
      "command": "npx",
      "args": ["-y", "evmscope"]
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "evmscope": {
      "command": "npx",
      "args": ["-y", "evmscope"]
    }
  }
}
```

## Tools

### getTokenPrice

Get current token price, 24h change, market cap, and volume.

```json
// Input
{ "token": "ETH", "chain": "ethereum" }

// Output
{
  "success": true,
  "data": {
    "symbol": "ETH",
    "name": "Ethereum",
    "priceUsd": 1929.20,
    "change24h": -2.34,
    "marketCap": 232000000000,
    "volume24h": 12500000000
  }
}
```

### getGasPrice

Get current gas prices in slow/normal/fast tiers with USD estimates.

```json
// Input
{ "chain": "ethereum" }

// Output
{
  "success": true,
  "data": {
    "slow": { "maxFeePerGas": "18.5", "maxPriorityFeePerGas": "1.2", "estimatedCostUsd": 0.75 },
    "normal": { "maxFeePerGas": "20.0", "maxPriorityFeePerGas": "1.5", "estimatedCostUsd": 0.81 },
    "fast": { "maxFeePerGas": "22.5", "maxPriorityFeePerGas": "2.25", "estimatedCostUsd": 0.91 },
    "baseFee": "17.3",
    "lastBlock": 19234567
  }
}
```

### getBalance

Get native token + ERC-20 token balances with USD values.

```json
// Input
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum" }

// Output
{
  "success": true,
  "data": {
    "address": "0xd8dA...",
    "nativeBalance": { "symbol": "ETH", "balanceFormatted": "1.234", "valueUsd": 2382.50 },
    "tokenBalances": [
      { "symbol": "USDC", "balanceFormatted": "1.0", "valueUsd": 1.00 }
    ],
    "totalValueUsd": 2383.50
  }
}
```

### getTokenInfo

Get ERC-20 token metadata (name, symbol, decimals, total supply).

```json
// Input
{ "token": "USDC", "chain": "ethereum" }

// Output
{
  "success": true,
  "data": {
    "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "name": "USD Coin",
    "symbol": "USDC",
    "decimals": 6,
    "totalSupply": "26000000000"
  }
}
```

### resolveENS

Resolve ENS names to addresses and vice versa (Ethereum mainnet only).

```json
// Input
{ "nameOrAddress": "vitalik.eth" }

// Output
{
  "success": true,
  "data": {
    "name": "vitalik.eth",
    "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "avatar": "https://...",
    "resolved": "name_to_address"
  }
}
```

### getTxStatus

Get transaction status, receipt, confirmations, and gas usage.

```json
// Input
{ "txHash": "0xabc...def", "chain": "ethereum" }

// Output
{
  "success": true,
  "data": {
    "hash": "0xabc...def",
    "status": "success",
    "blockNumber": 19234567,
    "confirmations": 42,
    "from": "0x1234...",
    "to": "0x5678...",
    "value": "1.5",
    "gasUsed": "21000",
    "effectiveGasPrice": "20.0",
    "timestamp": 1741521600
  }
}
```

### decodeTx

Decode a transaction into structured JSON — function name, parameters, event logs.

```json
// Input
{ "txHash": "0xabc...def", "chain": "ethereum" }

// Output
{
  "success": true,
  "data": {
    "hash": "0xabc...def",
    "from": "0x1234...",
    "to": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    "value": "1.0",
    "status": "success",
    "function": {
      "name": "swapExactETHForTokens",
      "signature": "swapExactETHForTokens(uint256,address[],address,uint256)",
      "args": { "amountOutMin": "1000000", "path": ["0xC02a...", "0xA0b8..."] }
    },
    "events": [
      { "name": "Transfer", "address": "0xA0b8...", "args": { "from": "0x...", "to": "0x...", "value": "1000000" } }
    ],
    "gasUsed": "150000",
    "gasPrice": "20.0"
  }
}
```

### getContractABI

Look up a verified contract's ABI (Etherscan → Sourcify fallback).

```json
// Input
{ "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "chain": "ethereum" }

// Output
{
  "success": true,
  "data": {
    "address": "0xA0b8...",
    "abi": [...],
    "source": "etherscan",
    "contractName": "FiatTokenV2_2",
    "isContract": true,
    "functionCount": 42,
    "eventCount": 8
  }
}
```

### identifyAddress

Identify an address — exchange, DeFi protocol, whale wallet, or EOA.

```json
// Input
{ "address": "0x28C6c06298d514Db089934071355E5743bf21d60", "chain": "ethereum" }

// Output
{
  "success": true,
  "data": {
    "address": "0x28C6...",
    "label": "Binance Hot Wallet",
    "category": "exchange",
    "protocol": null,
    "isContract": false,
    "tags": ["cex", "binance"]
  }
}
```

### compareGas

Compare gas fees across all 5 EVM chains at once, sorted by lowest cost.

```json
// Input
{}

// Output
{
  "success": true,
  "data": {
    "chains": [
      { "chain": "base", "baseFeeGwei": "0.01", "estimatedCostUsd": 0.0001 },
      { "chain": "arbitrum", "baseFeeGwei": "0.1", "estimatedCostUsd": 0.004 },
      { "chain": "optimism", "baseFeeGwei": "0.05", "estimatedCostUsd": 0.002 },
      { "chain": "polygon", "baseFeeGwei": "30.0", "estimatedCostUsd": 0.01 },
      { "chain": "ethereum", "baseFeeGwei": "20.0", "estimatedCostUsd": 0.81 }
    ],
    "cheapest": "base",
    "mostExpensive": "ethereum"
  }
}
```

### getApprovalStatus

Check ERC-20 token approval (allowance) status. Auto-checks major DeFi protocols with risk level assessment.

```json
// Input
{ "owner": "0xd8dA...", "token": "USDC", "chain": "ethereum" }

// Output
{
  "success": true,
  "data": {
    "owner": "0xd8dA...",
    "token": "USDC",
    "tokenAddress": "0xA0b8...",
    "approvals": [
      { "protocol": "Uniswap V3 (router)", "spender": "0xE592...", "allowance": "unlimited", "isUnlimited": true }
    ],
    "riskLevel": "moderate"
  }
}
```

### getProtocolTVL

Get DeFi protocol TVL (Total Value Locked) via DefiLlama — chain breakdown, 24h/7d changes.

```json
// Input
{ "protocol": "Aave" }

// Output
{
  "success": true,
  "data": {
    "protocol": "Aave",
    "slug": "aave",
    "totalTvlUsd": 12000000000,
    "change24h": 1.5,
    "change7d": -3.2,
    "chainBreakdown": [
      { "chain": "Ethereum", "tvlUsd": 8000000000, "percentage": 66.67 },
      { "chain": "Polygon", "tvlUsd": 2000000000, "percentage": 16.67 }
    ]
  }
}
```

### getWhaleMovements

Track large token transfers (whale movements). Classifies exchange deposit/withdrawal direction.

```json
// Input
{ "token": "USDC", "chain": "ethereum", "minValueUsd": 100000, "limit": 10 }

// Output
{
  "success": true,
  "data": {
    "token": "USDC",
    "tokenAddress": "0xA0b8...",
    "movements": [
      { "txHash": "0xabc...", "from": "0x1234...", "to": "0x28C6...", "fromLabel": null, "toLabel": "Binance Hot Wallet", "value": "500000.00", "valueUsd": 500000, "direction": "exchange_deposit", "timestamp": 1710000000 }
    ],
    "summary": { "totalMovements": 1, "totalValueUsd": 500000, "netExchangeFlow": 500000 }
  }
}
```

### getSwapQuote

Get DEX swap quotes via ParaSwap — optimal route, gas cost, auto ETH→WETH conversion.

```json
// Input
{ "tokenIn": "ETH", "tokenOut": "USDC", "amountIn": "1.0", "chain": "ethereum" }

// Output
{
  "success": true,
  "data": {
    "tokenIn": { "symbol": "ETH", "address": "0xEeee...", "amount": "1.000000" },
    "tokenOut": { "symbol": "USDC", "address": "0xA0b8...", "amount": "1929.200000" },
    "exchangeRate": 1929.2,
    "priceImpact": null,
    "source": "UniswapV3",
    "estimatedGasUsd": "3.50"
  }
}
```

## Supported Chains

| Chain | Chain ID | Native Token |
|-------|----------|-------------|
| Ethereum | 1 | ETH |
| Polygon | 137 | POL |
| Arbitrum | 42161 | ETH |
| Base | 8453 | ETH |
| Optimism | 10 | ETH |

## Environment Variables (Optional)

All environment variables are optional. evmscope works without any configuration.

| Variable | Purpose | Default |
|----------|---------|---------|
| `EVMSCOPE_RPC_URL` | Custom RPC endpoint | Public RPC |
| `EVMSCOPE_COINGECKO_KEY` | CoinGecko API key (higher rate limits) | Free tier |
| `EVMSCOPE_ETHERSCAN_KEY` | Etherscan API key (higher rate limits) | Free tier |
| `EVMSCOPE_POLYGONSCAN_KEY` | Polygonscan API key | Falls back to ETHERSCAN_KEY |
| `EVMSCOPE_ARBISCAN_KEY` | Arbiscan API key | Falls back to ETHERSCAN_KEY |
| `EVMSCOPE_BASESCAN_KEY` | Basescan API key | Falls back to ETHERSCAN_KEY |
| `EVMSCOPE_OPTIMISTIC_KEY` | Optimistic Etherscan API key | Falls back to ETHERSCAN_KEY |

## Built-in Databases

| Database | Contents |
|----------|----------|
| `tokens.json` | 49 major tokens with multi-chain addresses and CoinGecko IDs |
| `signatures.json` | 36 common function signatures (ERC-20, DEX, lending, NFT) |
| `labels.json` | 30 labeled addresses (exchanges, bridges, whale wallets) |
| `protocols.json` | 10 DeFi protocols with multi-chain contract addresses |

## Roadmap

- **v0.1** (done) — 5 tools: price, transaction fees, balance, token info, ENS
- **v0.5** (done) — +4 tools: decodeTx, getTxStatus, getContractABI, identifyAddress
- **v1.0** (done) — +5 tools: compareGas, getApprovalStatus, getProtocolTVL, getWhaleMovements, getSwapQuote
- **v1.5** — +6 tools: simulateTx, getYieldRates, getTokenHolders, getContractEvents, checkHoneypot, getBridgeRoutes

## License

[MIT](LICENSE)
