# evmscope

AIエージェント向けEVMブロックチェーンインテリジェンスツールキット。トークン価格、トランザクション手数料、ウォレット残高、トランザクション解析、アドレス識別など9つのツールを提供する単一MCPサーバー。

> 「AgentKitで実行し、evmscopeで判断する。」

## 特徴

- **9つのツール** — 価格、手数料、残高、トークン情報、ENS、TX状態、TX解析、ABI照会、アドレス識別
- **5つのEVMチェーン** — Ethereum、Polygon、Arbitrum、Base、Optimism
- **49の内蔵トークン** — ETH、USDC、USDT、WETH、LINK、UNI、AAVE、ARB、OP、PEPEなど
- **30以上のラベル付きアドレス** — 取引所、DeFiプロトコル、ブリッジ、クジラウォレット
- **ゼロ設定** — APIキー不要。無料パブリックAPIで即座に動作
- **読み取り専用** — トランザクション実行機能なし。資金損失リスクゼロ
- **内蔵フォールバック** — トークン/署名/ラベル内蔵DBでオフライン動作可能

## クイックスタート

```bash
npx evmscope
```

### Claude Desktop

`claude_desktop_config.json`に追加：

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

`.cursor/mcp.json`に追加：

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

## ツール

### getTokenPrice

トークンの現在価格、24時間変動率、時価総額、取引量を照会します。

```json
// 入力
{ "token": "ETH", "chain": "ethereum" }

// 出力
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

現在のGas料金をslow/normal/fastの3段階でUSD見積もりと共に照会します。

```json
// 入力
{ "chain": "ethereum" }

// 出力
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

ネイティブトークン + ERC-20トークンの残高をUSD換算額と共に照会します。

```json
// 入力
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum" }

// 出力
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

ERC-20トークンのメタデータ（名前、シンボル、小数点、総供給量）を照会します。

```json
// 入力
{ "token": "USDC", "chain": "ethereum" }

// 出力
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

ENS名とアドレスを双方向で解決します（Ethereumメインネット専用）。

```json
// 入力
{ "nameOrAddress": "vitalik.eth" }

// 出力
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

トランザクションの状態、レシート、確認数、Gas消費量を照会します。

```json
// 入力
{ "txHash": "0xabc...def", "chain": "ethereum" }

// 出力
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

トランザクションを構造化JSONに解析します — 関数名、パラメータ、イベントログ。

```json
// 入力
{ "txHash": "0xabc...def", "chain": "ethereum" }

// 出力
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

検証済みコントラクトのABIを照会します（Etherscan -> Sourcifyフォールバック）。

```json
// 入力
{ "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "chain": "ethereum" }

// 出力
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

アドレスを識別します — 取引所、DeFiプロトコル、クジラウォレット、EOA分類。

```json
// 入力
{ "address": "0x28C6c06298d514Db089934071355E5743bf21d60", "chain": "ethereum" }

// 出力
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

## サポートチェーン

| チェーン | Chain ID | ネイティブトークン |
|----------|----------|-------------------|
| Ethereum | 1 | ETH |
| Polygon | 137 | POL |
| Arbitrum | 42161 | ETH |
| Base | 8453 | ETH |
| Optimism | 10 | ETH |

## 環境変数（オプション）

すべての環境変数はオプションです。evmscopeは設定なしで即座に動作します。

| 変数 | 用途 | デフォルト |
|------|------|-----------|
| `EVMSCOPE_RPC_URL` | カスタムRPCエンドポイント | パブリックRPC |
| `EVMSCOPE_COINGECKO_KEY` | CoinGecko APIキー（高レート制限） | 無料枠 |
| `EVMSCOPE_ETHERSCAN_KEY` | Etherscan APIキー（高レート制限） | 無料枠 |
| `EVMSCOPE_POLYGONSCAN_KEY` | Polygonscan APIキー | ETHERSCAN_KEYにフォールバック |
| `EVMSCOPE_ARBISCAN_KEY` | Arbiscan APIキー | ETHERSCAN_KEYにフォールバック |
| `EVMSCOPE_BASESCAN_KEY` | Basescan APIキー | ETHERSCAN_KEYにフォールバック |
| `EVMSCOPE_OPTIMISTIC_KEY` | Optimistic Etherscan APIキー | ETHERSCAN_KEYにフォールバック |

## 内蔵データベース

| データベース | 内容 |
|-------------|------|
| `tokens.json` | 49の主要トークン — マルチチェーンアドレス + CoinGecko ID |
| `signatures.json` | 36の関数シグネチャ — ERC-20、DEX、レンディング、NFT |
| `labels.json` | 30のラベル付きアドレス — 取引所、ブリッジ、クジラウォレット |
| `protocols.json` | 10のDeFiプロトコル — マルチチェーンコントラクトアドレス |

## ロードマップ

- **v0.1**（完了）— 5つのツール：価格、Gas、残高、トークン情報、ENS
- **v0.5**（完了）— +4つのツール：decodeTx、getTxStatus、getContractABI、identifyAddress
- **v1.0** — +5つのツール：getSwapQuote、getApprovalStatus、getProtocolTVL、compareGas、getWhaleMovements
- **v1.5** — +6つのツール：simulateTx、getYieldRates、getTokenHolders、getContractEvents、checkHoneypot、getBridgeRoutes

## ライセンス

[MIT](LICENSE)
