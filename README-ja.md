# evmscope

[English](README.md) | [한국어](README-ko.md) | [中文](README-zh.md) | [Español](README-es.md) | [Русский](README-ru.md)

EVMブロックチェーンインテリジェンスツールキット。7チェーンで26ツール — CLIまたはMCPサーバーとして使用。トークン価格、ガス比較、スワップ見積、DeFi利回り、ハニーポット検出、ブリッジルート、TX シミュレーション、NFT検索、ガバナンス提案、ポートフォリオ追跡など。

## なぜ evmscope？

Claude や GPT などの AI エージェントは、リアルタイムのブロックチェーンデータにアクセスできません。「ETH の価格は？」「このウォレットの残高は？」と聞いても、「リアルタイムデータにはアクセスできません」という回答が返ってきます。

evmscope は MCP プロトコルを通じて、AI エージェントに 26 のオンチェーンツールへの直接アクセスを提供します — トークン価格、ウォレット残高、DeFi 利回り、クジラ追跡、ハニーポット検出など。API キー不要、設定不要、接続するだけですぐに使えます。

## 誰のためのツール？

| ユーザー | 活用方法 |
|----------|----------|
| **AI エージェント開発者** | MCP サーバーとして接続し、AI にオンチェーン分析能力を付与 |
| **クリプトトレーダー＆リサーチャー** | ターミナルからトークン、ウォレット、プロトコルを直接照会 |
| **DeFi ユーザー** | 安全ツール — ハニーポット検出、承認状態確認、クジラ追跡 |

## 特徴

- **26のツール** — 価格、Gas比較、スワップ見積もり、DeFi利回り、ハニーポット検出、ブリッジルート、TXシミュレーション、イベントログ、トークンホルダー、承認状態、TVL、クジラ追跡、残高、トークン情報、ENS、TX状態、TX解析、ABI照会、アドレス識別、NFT情報、NFTメタデータ、ガバナンス提案、ブロック情報、トークン転送履歴、ポートフォリオ
- **7つのEVMチェーン** — Ethereum、Polygon、Arbitrum、Base、Optimism、Avalanche、BSC
- **49の内蔵トークン** — ETH、USDC、USDT、WETH、LINK、UNI、AAVE、ARB、OP、PEPEなど
- **30以上のラベル付きアドレス** — 取引所、DeFiプロトコル、ブリッジ、クジラウォレット
- **ゼロ設定** — APIキー不要。無料パブリックAPIで即座に動作
- **読み取り専用** — トランザクション実行機能なし。資金損失リスクゼロ
- **デュアルモード** — ターミナル直接使用のCLI + AIエージェント統合のMCPサーバー

## クイックスタート

### CLI

```bash
npx evmscope price ETH
npx evmscope gas
npx evmscope balance 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
npx evmscope portfolio 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
npx evmscope compare-gas
npx evmscope tvl Aave
npx evmscope swap ETH USDC 1.0
npx evmscope block latest
npx evmscope transfers 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
npx evmscope honeypot 0x...
```

`npx evmscope --help` で全22コマンドを確認。`--json` フラグでJSON出力も可能。

### MCPサーバー

MCPサーバーとして起動（引数なし）：

```bash
npx evmscope
```

### Claude Code

```bash
claude mcp add evmscope -- npx -y evmscope
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

### compareGas

7つのEVMチェーンのGas料金を一度に比較します。最安順にソート。

```json
// 入力
{}

// 出力
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

ERC-20トークンの承認（allowance）状態を照会します。主要DeFiプロトコルを自動チェック、リスクレベル判定。

```json
// 入力
{ "owner": "0xd8dA...", "token": "USDC", "chain": "ethereum" }

// 出力
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

DeFiプロトコルのTVL（Total Value Locked）を照会します（DefiLlama基盤、チェーン別分布、24h/7d変動率）。

```json
// 入力
{ "protocol": "Aave" }

// 出力
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

大規模トークン転送（クジラの動き）を追跡します。取引所入出金方向の判定、要約統計を含む。

```json
// 入力
{ "token": "USDC", "chain": "ethereum", "minValueUsd": 100000, "limit": 10 }

// 出力
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

DEXスワップ見積もりを照会します（ParaSwap基盤、最適ルート、Gas費込み、ETH→WETH自動変換）。

```json
// 入力
{ "tokenIn": "ETH", "tokenOut": "USDC", "amountIn": "1.0", "chain": "ethereum" }

// 出力
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

### getYieldRates

DeFi利回り（APY）を照会します（DefiLlama基盤、プロトコル/チェーン別フィルター）。

```json
// 入力
{ "protocol": "aave-v3", "chain": "Ethereum", "minTvl": 1000000 }
// 出力
{ "success": true, "data": { "pools": [{ "project": "aave-v3", "symbol": "USDC", "apy": 5.2, "tvlUsd": 500000000 }], "count": 10 } }
```

### getContractEvents

コントラクトイベントログを照会します（ABI自動デコード）。

```json
// 入力
{ "address": "0xA0b8...", "chain": "ethereum", "limit": 5 }
// 出力
{ "success": true, "data": { "events": [{ "name": "Transfer", "args": { "from": "0x...", "to": "0x...", "value": "1000000" }, "blockNumber": 19234567 }], "count": 5 } }
```

### getTokenHolders

トークンのトップホルダーを照会します（Ethereum: Ethplorer、他のチェーン: Etherscan集計）。

```json
// 入力
{ "token": "USDC", "chain": "ethereum", "limit": 10 }
// 出力
{ "success": true, "data": { "holders": [{ "address": "0x...", "balance": "1000000", "share": 15.5 }], "totalHolders": 12345 } }
```

### simulateTx

トランザクションをシミュレーションします（eth_call + estimateGas、Gas費用USD換算、revert reasonデコード）。

```json
// 入力
{ "from": "0x1234...", "to": "0x5678...", "data": "0xa9059cbb...", "chain": "ethereum" }
// 出力
{ "success": true, "data": { "success": true, "gasEstimate": "65000", "gasEstimateUsd": 2.50, "returnData": "0x0000...0001", "error": null } }
```

### checkHoneypot

ハニーポット（詐欺）トークンを検出します（Honeypot.is基盤、買い/売り税率、リスクレベル）。

```json
// 入力
{ "token": "0x...", "chain": "ethereum" }
// 出力
{ "success": true, "data": { "isHoneypot": false, "riskLevel": "safe", "buyTax": 0, "sellTax": 0, "flags": [] } }
```

### getBridgeRoutes

クロスチェーンブリッジルートを照会します（LI.FI基盤、コスト/時間/ルート比較）。

```json
// 入力
{ "fromChain": "ethereum", "toChain": "arbitrum", "token": "USDC", "amount": "100" }
// 出力
{ "success": true, "data": { "routes": [{ "bridge": "Stargate", "estimatedTime": 60, "feeUsd": 0.50, "amountOut": "99.50" }], "bestRoute": { "bridge": "Stargate" } } }
```

### getNFTInfo

ウォレットのERC-721 NFT残高とトークンリストを照会します。

```json
// 入力
{ "address": "0xd8dA...", "contractAddress": "0x...", "chain": "ethereum" }

// 出力
{
  "success": true,
  "data": {
    "chain": "ethereum",
    "contractAddress": "0x...",
    "owner": "0xd8dA...",
    "totalBalance": 3,
    "nfts": [
      { "tokenId": "1234", "tokenURI": "ipfs://..." }
    ]
  }
}
```

### getNFTMetadata

特定NFTトークンのメタデータ（名前、画像、属性）を照会します。

```json
// 入力
{ "contractAddress": "0x...", "tokenId": "1234", "chain": "ethereum" }

// 出力
{
  "success": true,
  "data": {
    "contractAddress": "0x...",
    "tokenId": "1234",
    "tokenURI": "ipfs://...",
    "metadata": {
      "name": "Cool NFT #1234",
      "description": "A very cool NFT",
      "image": "ipfs://...",
      "attributes": [
        { "trait_type": "Background", "value": "Blue" }
      ]
    }
  }
}
```

### getGovernanceProposals

Snapshotベースのガバナンス提案を照会します（active/closed/all）。

```json
// 入力
{ "protocol": "uniswap", "state": "active" }

// 出力
{
  "success": true,
  "data": {
    "space": "uniswapgovernance.eth",
    "state": "active",
    "proposals": [
      {
        "title": "Proposal Title",
        "state": "active",
        "author": "0x1234...",
        "start": "2025-01-01",
        "end": "2025-01-07",
        "votes": 1500,
        "quorum": 1000,
        "choices": ["For", "Against"],
        "scores": [75.5, 24.5]
      }
    ]
  }
}
```

### getBlockInfo

ブロック番号または最新ブロックの詳細情報（タイムスタンプ、gas、トランザクション数、バリデーター）を取得。

```json
// 入力
{ "blockNumber": 19234567, "chain": "ethereum" }

// 出力
{
  "success": true,
  "data": {
    "number": 19234567,
    "timestamp": 1741521600,
    "gasUsed": "12345678",
    "gasLimit": "30000000",
    "baseFeePerGas": "20.0",
    "transactionCount": 150,
    "miner": "0x1234..."
  }
}
```

### getTokenTransfers

ウォレットアドレスの最近のERC-20トークン転送履歴（入金/出金）を取得。

```json
// 入力
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum", "limit": 5 }

// 出力
{
  "success": true,
  "data": {
    "transfers": [
      { "token": "USDC", "from": "0x1234...", "to": "0xd8dA...", "value": "1000.00", "direction": "in", "txHash": "0xabc...", "timestamp": 1741521600 }
    ],
    "count": 5
  }
}
```

### getPortfolio

ウォレットの完全な資産ポートフォリオ（ネイティブ + ERC-20、USD価値、割合）を取得。

```json
// 入力
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum" }

// 出力
{
  "success": true,
  "data": {
    "address": "0xd8dA...",
    "native": { "symbol": "ETH", "balance": "1.234", "valueUsd": 2382.50 },
    "tokens": [
      { "symbol": "USDC", "balance": "1000.00", "valueUsd": 1000.00, "percentage": 29.6 }
    ],
    "totalValueUsd": 3382.50
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
| Avalanche | 43114 | AVAX |
| BSC | 56 | BNB |

## 環境変数（オプション）

すべての環境変数はオプションです。evmscopeは設定なしで即座に動作します。

| 変数 | 用途 | デフォルト |
|------|------|-----------|
| `EVMSCOPE_RPC_URL` | カスタムRPCエンドポイント（全チェーン） | パブリックRPC |
| `EVMSCOPE_RPC_URL_ETHEREUM` | Ethereum専用RPCエンドポイント | RPC_URLにフォールバック |
| `EVMSCOPE_RPC_URL_POLYGON` | Polygon専用RPCエンドポイント | RPC_URLにフォールバック |
| `EVMSCOPE_RPC_URL_ARBITRUM` | Arbitrum専用RPCエンドポイント | RPC_URLにフォールバック |
| `EVMSCOPE_RPC_URL_BASE` | Base専用RPCエンドポイント | RPC_URLにフォールバック |
| `EVMSCOPE_RPC_URL_OPTIMISM` | Optimism専用RPCエンドポイント | RPC_URLにフォールバック |
| `EVMSCOPE_RPC_URL_AVALANCHE` | Avalanche専用RPCエンドポイント | RPC_URLにフォールバック |
| `EVMSCOPE_RPC_URL_BSC` | BSC専用RPCエンドポイント | RPC_URLにフォールバック |
| `EVMSCOPE_COINGECKO_KEY` | CoinGecko APIキー（高レート制限） | 無料枠 |
| `EVMSCOPE_ETHERSCAN_KEY` | Etherscan APIキー（高レート制限） | 無料枠 |
| `EVMSCOPE_POLYGONSCAN_KEY` | Polygonscan APIキー | ETHERSCAN_KEYにフォールバック |
| `EVMSCOPE_ARBISCAN_KEY` | Arbiscan APIキー | ETHERSCAN_KEYにフォールバック |
| `EVMSCOPE_BASESCAN_KEY` | Basescan APIキー | ETHERSCAN_KEYにフォールバック |
| `EVMSCOPE_OPTIMISTIC_KEY` | Optimistic Etherscan APIキー | ETHERSCAN_KEYにフォールバック |
| `EVMSCOPE_SNOWTRACE_KEY` | Snowtrace APIキー（Avalanche） | ETHERSCAN_KEYにフォールバック |
| `EVMSCOPE_BSCSCAN_KEY` | BscScan APIキー（BSC） | ETHERSCAN_KEYにフォールバック |
| `EVMSCOPE_ETHPLORER_KEY` | Ethplorer APIキー（トークンホルダー） | `freekey` |
| `EVMSCOPE_LIFI_KEY` | LI.FI APIキー（ブリッジルート） | パブリックアクセス |
| `EVMSCOPE_DEBUG` | デバッグログ有効化（`1`に設定） | 無効 |

## 内蔵データベース

| データベース | 内容 |
|-------------|------|
| `tokens.json` | 49の主要トークン — マルチチェーンアドレス + CoinGecko ID |
| `signatures.json` | 36の関数シグネチャ — ERC-20、DEX、レンディング、NFT |
| `labels.json` | 30のラベル付きアドレス — 取引所、ブリッジ、クジラウォレット |
| `protocols.json` | 10のDeFiプロトコル — マルチチェーンコントラクトアドレス |

## ロードマップ

- **v0.1**（完了）— 5つのツール：価格、トランザクション手数料、残高、トークン情報、ENS
- **v0.5**（完了）— +4つのツール：decodeTx、getTxStatus、getContractABI、identifyAddress
- **v1.0**（完了）— +5つのツール：compareGas、getApprovalStatus、getProtocolTVL、getWhaleMovements、getSwapQuote
- **v1.5**（完了）— +6つのツール：simulateTx、getYieldRates、getTokenHolders、getContractEvents、checkHoneypot、getBridgeRoutes
- **v1.5.1**（完了）— コード品質 + セキュリティリファクタリング：7つの新共有モジュール、チェーン別RPC URL、キャッシュサイズ制限、統一アドレス検証、CLIモジュール化
- **v1.6.0**（完了）— +3つのツール：getNFTInfo、getNFTMetadata、getGovernanceProposals。+2つのチェーン：Avalanche、BSC
- **v1.7.0**（完了）— +3ツール：getBlockInfo、getTokenTransfers、getPortfolio。セキュリティ強化（v1.6.1）

## ライセンス

[MIT](LICENSE)
