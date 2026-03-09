# evmscope

面向 AI 代理的 EVM 区块链智能工具包。单一 MCP 服务器提供代币价格、Gas 对比、兑换报价、授权状态、TVL、巨鲸追踪等 14 个工具。

> "用 AgentKit 执行，用 evmscope 决策。"

## 特性

- **14 个工具** — 价格、Gas 对比、兑换报价、授权状态、TVL、巨鲸追踪、余额、代币信息、ENS、交易状态、交易解析、ABI 查询、地址识别
- **5 条 EVM 链** — Ethereum、Polygon、Arbitrum、Base、Optimism
- **49 个内置代币** — ETH、USDC、USDT、WETH、LINK、UNI、AAVE、ARB、OP、PEPE 等
- **30+ 标记地址** — 交易所、DeFi 协议、跨链桥、巨鲸钱包
- **零配置** — 无需 API 密钥，使用免费公共 API 即刻运行
- **只读模式** — 无交易执行功能，零资金损失风险
- **内置回退** — 代币/签名/标签内置数据库，支持离线运行

## 快速开始

```bash
npx evmscope
```

### CLI 模式

无需 AI 客户端，直接在终端中使用：

```bash
npx evmscope price ETH
npx evmscope compare-gas
npx evmscope tvl Aave
npx evmscope swap ETH USDC 1.0
npx evmscope balance 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

运行 `npx evmscope --help` 查看所有命令。添加 `--json` 获取原始 JSON 输出。

### Claude Desktop

添加到 `claude_desktop_config.json`：

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

添加到 `.cursor/mcp.json`：

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

## 工具

### getTokenPrice

查询代币当前价格、24 小时涨跌幅、市值和交易量。

```json
// 输入
{ "token": "ETH", "chain": "ethereum" }

// 输出
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

查询当前 Gas 费用，提供 slow/normal/fast 三档及美元估算。

```json
// 输入
{ "chain": "ethereum" }

// 输出
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

查询原生代币 + ERC-20 代币余额及美元估值。

```json
// 输入
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum" }

// 输出
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

查询 ERC-20 代币元数据（名称、符号、精度、总供应量）。

```json
// 输入
{ "token": "USDC", "chain": "ethereum" }

// 输出
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

双向解析 ENS 名称与地址（仅限 Ethereum 主网）。

```json
// 输入
{ "nameOrAddress": "vitalik.eth" }

// 输出
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

查询交易状态、回执、确认数和 Gas 消耗。

```json
// 输入
{ "txHash": "0xabc...def", "chain": "ethereum" }

// 输出
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

将交易解析为结构化 JSON — 函数名、参数、事件日志。

```json
// 输入
{ "txHash": "0xabc...def", "chain": "ethereum" }

// 输出
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

查询已验证合约的 ABI（Etherscan -> Sourcify 回退）。

```json
// 输入
{ "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "chain": "ethereum" }

// 输出
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

识别地址身份 — 交易所、DeFi 协议、巨鲸钱包、EOA 分类。

```json
// 输入
{ "address": "0x28C6c06298d514Db089934071355E5743bf21d60", "chain": "ethereum" }

// 输出
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

一次对比所有 5 条 EVM 链的 Gas 费用，按最低成本排序。

```json
// 输入
{}

// 输出
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

查询 ERC-20 代币授权（allowance）状态。自动检查主要 DeFi 协议，评估风险等级。

```json
// 输入
{ "owner": "0xd8dA...", "token": "USDC", "chain": "ethereum" }

// 输出
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

查询 DeFi 协议的 TVL（总锁仓价值），基于 DefiLlama — 链分布、24h/7d 变化率。

```json
// 输入
{ "protocol": "Aave" }

// 输出
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

追踪大额代币转账（巨鲸动向）。判定交易所存取方向，包含汇总统计。

```json
// 输入
{ "token": "USDC", "chain": "ethereum", "minValueUsd": 100000, "limit": 10 }

// 输出
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

查询 DEX 兑换报价（基于 ParaSwap，最优路径，含 Gas 费，ETH→WETH 自动转换）。

```json
// 输入
{ "tokenIn": "ETH", "tokenOut": "USDC", "amountIn": "1.0", "chain": "ethereum" }

// 输出
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

## 支持的链

| 链 | Chain ID | 原生代币 |
|----|----------|---------|
| Ethereum | 1 | ETH |
| Polygon | 137 | POL |
| Arbitrum | 42161 | ETH |
| Base | 8453 | ETH |
| Optimism | 10 | ETH |

## 环境变量（可选）

所有环境变量均为可选。evmscope 无需任何配置即可运行。

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `EVMSCOPE_RPC_URL` | 自定义 RPC 端点 | 公共 RPC |
| `EVMSCOPE_COINGECKO_KEY` | CoinGecko API 密钥（更高速率限制） | 免费层 |
| `EVMSCOPE_ETHERSCAN_KEY` | Etherscan API 密钥（更高速率限制） | 免费层 |
| `EVMSCOPE_POLYGONSCAN_KEY` | Polygonscan API 密钥 | 回退至 ETHERSCAN_KEY |
| `EVMSCOPE_ARBISCAN_KEY` | Arbiscan API 密钥 | 回退至 ETHERSCAN_KEY |
| `EVMSCOPE_BASESCAN_KEY` | Basescan API 密钥 | 回退至 ETHERSCAN_KEY |
| `EVMSCOPE_OPTIMISTIC_KEY` | Optimistic Etherscan API 密钥 | 回退至 ETHERSCAN_KEY |

## 内置数据库

| 数据库 | 内容 |
|--------|------|
| `tokens.json` | 49 个主要代币 — 多链地址 + CoinGecko ID |
| `signatures.json` | 36 个函数签名 — ERC-20、DEX、借贷、NFT |
| `labels.json` | 30 个标记地址 — 交易所、跨链桥、巨鲸钱包 |
| `protocols.json` | 10 个 DeFi 协议 — 多链合约地址 |

## 路线图

- **v0.1**（已完成）— 5 个工具：价格、交易手续费、余额、代币信息、ENS
- **v0.5**（已完成）— +4 个工具：decodeTx、getTxStatus、getContractABI、identifyAddress
- **v1.0**（已完成）— +5 个工具：compareGas、getApprovalStatus、getProtocolTVL、getWhaleMovements、getSwapQuote
- **v1.5** — +6 个工具：simulateTx、getYieldRates、getTokenHolders、getContractEvents、checkHoneypot、getBridgeRoutes

## 许可证

[MIT](LICENSE)
