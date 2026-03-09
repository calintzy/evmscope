# evmscope

EVM blockchain intelligence toolkit for AI agents. A single MCP server providing 20 tools for price, gas, balance, token info, ENS resolution, and more.

> "AgentKit executes. evmscope decides."

## Features

- **5 tools** (MVP) — `getTokenPrice`, `getGasPrice`, `getBalance`, `getTokenInfo`, `resolveENS`
- **5 EVM chains** — Ethereum, Polygon, Arbitrum, Base, Optimism
- **Zero config** — No API keys required. Works out of the box with free public APIs
- **Read-only** — No transaction execution. Zero risk of fund loss
- **Built-in fallbacks** — Embedded token database for offline operation

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
  "chain": "ethereum",
  "data": {
    "symbol": "ETH",
    "name": "Ethereum",
    "priceUsd": 1929.20,
    "change24h": -2.34,
    "marketCap": 232000000000,
    "volume24h": 12500000000
  },
  "cached": false,
  "timestamp": 1741521600000
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
  "chain": "ethereum",
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
  "chain": "ethereum",
  "data": {
    "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "nativeBalance": {
      "symbol": "ETH",
      "balance": "1234567890123456789",
      "balanceFormatted": "1.234567890123456789",
      "valueUsd": 2382.50
    },
    "tokenBalances": [
      { "symbol": "USDC", "address": "0xA0b8...", "balance": "1000000", "balanceFormatted": "1.0", "decimals": 6, "valueUsd": 1.00 }
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
  "chain": "ethereum",
  "data": {
    "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "name": "USD Coin",
    "symbol": "USDC",
    "decimals": 6,
    "totalSupply": "26000000000",
    "chain": "ethereum"
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
  "chain": "ethereum",
  "data": {
    "name": "vitalik.eth",
    "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    "avatar": "https://...",
    "resolved": "name_to_address"
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
| `EVMSCOPE_ETHERSCAN_KEY` | Etherscan API key | Free tier |

## Roadmap

- **v0.1** (MVP) — 5 tools: price, gas, balance, token info, ENS
- **v0.5** — +4 tools: decodeTx, getTxStatus, getContractABI, identifyAddress
- **v1.0** — +5 tools: getSwapQuote, getApprovalStatus, getProtocolTVL, compareGas, getWhaleMovements
- **v1.5** — +6 tools: simulateTx, getYieldRates, getTokenHolders, getContractEvents, checkHoneypot, getBridgeRoutes

## License

[MIT](LICENSE)
