# evmscope

[English](README.md) | [한국어](README-ko.md) | [中文](README-zh.md) | [日本語](README-ja.md) | [Español](README-es.md)

Инструментарий для анализа EVM-блокчейнов. 26 инструментов для 7 сетей — работает как CLI или MCP-сервер. Цена токена, сравнение газа, котировка свопа, ставки доходности, обнаружение хонипотов, маршруты мостов, симуляция транзакций, поиск NFT, предложения по управлению, отслеживание портфолио и многое другое.

## Зачем evmscope?

ИИ-агенты вроде Claude и GPT не могут получить доступ к данным блокчейна в реальном времени. Спросите «Какая цена ETH?» или «Покажи баланс этого кошелька» — и получите ответ «Я не могу получить доступ к данным в реальном времени.»

evmscope решает эту проблему, предоставляя ИИ-агентам прямой доступ к 26 ончейн-инструментам через протокол MCP — цены токенов, балансы кошельков, доходность DeFi, отслеживание китов, обнаружение хонипотов и многое другое. Без API-ключей, без настройки — просто подключите и работайте.

## Для кого это?

| Пользователь | Сценарий использования |
|--------------|------------------------|
| **Разработчики ИИ-агентов** | Подключить как MCP-сервер для предоставления ИИ возможностей ончейн-анализа |
| **Криптотрейдеры и исследователи** | Запрос токенов, кошельков и протоколов прямо из терминала |
| **Пользователи DeFi** | Инструменты безопасности — обнаружение хонипотов, проверка разрешений, отслеживание китов |

## Возможности

- **26 инструментов** — Цена, сравнение газа, котировка свопа, ставки доходности, обнаружение хонипотов, маршруты мостов, симуляция транзакций, журнал событий, держатели токенов, статус разрешений, TVL, отслеживание китов, баланс, информация о токене, ENS, статус транзакции, декодирование транзакции, поиск ABI, идентификация адреса, информация о блоке, переводы токенов, портфолио, NFT и предложения по управлению
- **7 EVM-сетей** — Ethereum, Polygon, Arbitrum, Base, Optimism, Avalanche, BSC
- **49 встроенных токенов** — ETH, USDC, USDT, WETH, LINK, UNI, AAVE, ARB, OP, PEPE и другие
- **30+ размеченных адресов** — Биржи, DeFi-протоколы, мосты, кошельки китов
- **Нулевая настройка** — Без API-ключей. Работает сразу с бесплатными публичными API
- **Только чтение** — Без выполнения транзакций. Нулевой риск потери средств
- **Двойной режим** — CLI для прямого использования в терминале, MCP-сервер для интеграции с AI-агентами

## Быстрый старт

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

Запустите `npx evmscope --help`, чтобы увидеть все 22 команды. Добавьте `--json` для вывода в формате JSON.

### MCP-сервер

Запуск в режиме MCP-сервера (без аргументов):

```bash
npx evmscope
```

### Claude Code

```bash
claude mcp add evmscope -- npx -y evmscope
```

### Claude Desktop

Добавьте в `claude_desktop_config.json`:

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

Добавьте в `.cursor/mcp.json`:

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

## Инструменты

### getTokenPrice

Получить текущую цену токена, изменение за 24 часа, рыночную капитализацию и объём торгов.

```json
// Вход
{ "token": "ETH", "chain": "ethereum" }

// Выход
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

Получить текущую цену газа в трёх режимах: медленный / обычный / быстрый — с оценкой стоимости в USD.

```json
// Вход
{ "chain": "ethereum" }

// Выход
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

Получить баланс нативного токена и ERC-20 токенов с оценкой в USD.

```json
// Вход
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum" }

// Выход
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

Получить метаданные ERC-20 токена (название, символ, десятичные знаки, общее предложение).

```json
// Вход
{ "token": "USDC", "chain": "ethereum" }

// Выход
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

Разрешить ENS-имена в адреса и обратно (только для Ethereum mainnet).

```json
// Вход
{ "nameOrAddress": "vitalik.eth" }

// Выход
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

Получить статус транзакции, квитанцию, количество подтверждений и расход газа.

```json
// Вход
{ "txHash": "0xabc...def", "chain": "ethereum" }

// Выход
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

Декодировать транзакцию в структурированный JSON — имя функции, параметры, журнал событий.

```json
// Вход
{ "txHash": "0xabc...def", "chain": "ethereum" }

// Выход
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

Получить ABI верифицированного контракта (Etherscan → Sourcify как запасной вариант).

```json
// Вход
{ "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "chain": "ethereum" }

// Выход
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

Идентифицировать адрес — биржа, DeFi-протокол, кошелёк кита или EOA.

```json
// Вход
{ "address": "0x28C6c06298d514Db089934071355E5743bf21d60", "chain": "ethereum" }

// Выход
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

Сравнить комиссии за газ во всех 7 EVM-сетях одновременно, отсортировано по наименьшей стоимости.

```json
// Вход
{}

// Выход
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

Проверить статус разрешения (allowance) для ERC-20 токена. Автоматически проверяет основные DeFi-протоколы с оценкой уровня риска.

```json
// Вход
{ "owner": "0xd8dA...", "token": "USDC", "chain": "ethereum" }

// Выход
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

Получить TVL (общую заблокированную стоимость) DeFi-протокола через DefiLlama — разбивка по сетям, изменения за 24 часа / 7 дней.

```json
// Вход
{ "protocol": "Aave" }

// Выход
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

Отслеживать крупные переводы токенов (движения китов). Классифицирует направление — пополнение или вывод с биржи.

```json
// Вход
{ "token": "USDC", "chain": "ethereum", "minValueUsd": 100000, "limit": 10 }

// Выход
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

Получить котировку свопа через ParaSwap — оптимальный маршрут, стоимость газа, автоматическая конвертация ETH→WETH.

```json
// Вход
{ "tokenIn": "ETH", "tokenOut": "USDC", "amountIn": "1.0", "chain": "ethereum" }

// Выход
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

Получить ставки доходности (APY) из DefiLlama. Фильтрация по протоколу, сети, минимальному TVL.

```json
// Вход
{ "protocol": "aave-v3", "chain": "Ethereum", "minTvl": 1000000 }

// Выход
{
  "success": true,
  "data": {
    "pools": [
      { "project": "aave-v3", "symbol": "USDC", "chain": "Ethereum", "apy": 5.2, "tvlUsd": 500000000, "stablecoin": true }
    ],
    "count": 10
  }
}
```

### getContractEvents

Получить журнал событий контракта с автоматическим декодированием по ABI.

```json
// Вход
{ "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "chain": "ethereum", "limit": 5 }

// Выход
{
  "success": true,
  "data": {
    "events": [
      { "name": "Transfer", "args": { "from": "0x...", "to": "0x...", "value": "1000000" }, "txHash": "0x...", "blockNumber": 19234567 }
    ],
    "count": 5,
    "fromBlock": 19233567,
    "toBlock": 19234567
  }
}
```

### getTokenHolders

Получить список крупнейших держателей токена. Для Ethereum используется Ethplorer, для других сетей — агрегация из переводов Etherscan.

```json
// Вход
{ "token": "USDC", "chain": "ethereum", "limit": 10 }

// Выход
{
  "success": true,
  "data": {
    "token": "0xA0b8...",
    "holders": [
      { "address": "0x...", "balance": "1000000", "share": 15.5 }
    ],
    "totalHolders": 12345
  }
}
```

### simulateTx

Симулировать транзакцию через eth_call + estimateGas. Возвращает оценку газа в USD и причину отката при неудаче.

```json
// Вход
{ "from": "0x1234...", "to": "0x5678...", "data": "0xa9059cbb...", "chain": "ethereum" }

// Выход
{
  "success": true,
  "data": {
    "success": true,
    "gasEstimate": "65000",
    "gasEstimateUsd": 2.50,
    "returnData": "0x0000...0001",
    "error": null
  }
}
```

### checkHoneypot

Обнаружение хонипотов (мошеннических токенов) через Honeypot.is. Возвращает налог на покупку/продажу, уровень риска и флаги предупреждений.

```json
// Вход
{ "token": "0x...", "chain": "ethereum" }

// Выход
{
  "success": true,
  "data": {
    "isHoneypot": false,
    "riskLevel": "safe",
    "buyTax": 0,
    "sellTax": 0,
    "flags": [],
    "tokenName": "USD Coin",
    "tokenSymbol": "USDC"
  }
}
```

### getBridgeRoutes

Получить маршруты мостов через LI.FI. Сравнивает комиссии, время и итоговую сумму.

```json
// Вход
{ "fromChain": "ethereum", "toChain": "arbitrum", "token": "USDC", "amount": "100" }

// Выход
{
  "success": true,
  "data": {
    "routes": [
      { "bridge": "Stargate", "estimatedTime": 60, "feeUsd": 0.50, "gasCostUsd": 2.10, "amountOut": "99.50", "amountOutUsd": 99.50 }
    ],
    "bestRoute": { "bridge": "Stargate", "..." : "..." }
  }
}
```

### getNFTInfo

Получить баланс ERC-721 NFT и список токенов для кошелька.

```json
// Вход
{ "address": "0xd8dA...", "contractAddress": "0x...", "chain": "ethereum" }

// Выход
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

Получить метаданные конкретного NFT-токена (название, изображение, атрибуты).

```json
// Вход
{ "contractAddress": "0x...", "tokenId": "1234", "chain": "ethereum" }

// Выход
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

Получить предложения по управлению из Snapshot (активные, завершённые или все).

```json
// Вход
{ "protocol": "uniswap", "state": "active" }

// Выход
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

Детали блока (временная метка, газ, транзакции, валидатор) по номеру или последний блок.

```json
// Вход
{ "blockNumber": 19234567, "chain": "ethereum" }

// Выход
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

История недавних переводов токенов ERC-20 для адреса кошелька.

```json
// Вход
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum", "limit": 5 }

// Выход
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

Полное портфолио кошелька — баланс нативных и ERC-20 токенов с оценкой в USD.

```json
// Вход
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum" }

// Выход
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

## Поддерживаемые сети

| Сеть | Chain ID | Нативный токен |
|------|----------|----------------|
| Ethereum | 1 | ETH |
| Polygon | 137 | POL |
| Arbitrum | 42161 | ETH |
| Base | 8453 | ETH |
| Optimism | 10 | ETH |
| Avalanche | 43114 | AVAX |
| BSC | 56 | BNB |

## Переменные окружения (необязательно)

Все переменные окружения необязательны. evmscope работает без какой-либо настройки.

| Переменная | Назначение | По умолчанию |
|------------|-----------|--------------|
| `EVMSCOPE_RPC_URL` | Пользовательский RPC-эндпоинт (для всех сетей) | Публичный RPC |
| `EVMSCOPE_RPC_URL_ETHEREUM` | RPC-эндпоинт для Ethereum | Использует RPC_URL |
| `EVMSCOPE_RPC_URL_POLYGON` | RPC-эндпоинт для Polygon | Использует RPC_URL |
| `EVMSCOPE_RPC_URL_ARBITRUM` | RPC-эндпоинт для Arbitrum | Использует RPC_URL |
| `EVMSCOPE_RPC_URL_BASE` | RPC-эндпоинт для Base | Использует RPC_URL |
| `EVMSCOPE_RPC_URL_OPTIMISM` | RPC-эндпоинт для Optimism | Использует RPC_URL |
| `EVMSCOPE_RPC_URL_AVALANCHE` | RPC-эндпоинт для Avalanche | Использует RPC_URL |
| `EVMSCOPE_RPC_URL_BSC` | RPC-эндпоинт для BSC | Использует RPC_URL |
| `EVMSCOPE_COINGECKO_KEY` | API-ключ CoinGecko (повышенные лимиты запросов) | Бесплатный тариф |
| `EVMSCOPE_ETHERSCAN_KEY` | API-ключ Etherscan (повышенные лимиты запросов) | Бесплатный тариф |
| `EVMSCOPE_POLYGONSCAN_KEY` | API-ключ Polygonscan | Использует ETHERSCAN_KEY |
| `EVMSCOPE_ARBISCAN_KEY` | API-ключ Arbiscan | Использует ETHERSCAN_KEY |
| `EVMSCOPE_BASESCAN_KEY` | API-ключ Basescan | Использует ETHERSCAN_KEY |
| `EVMSCOPE_OPTIMISTIC_KEY` | API-ключ Optimistic Etherscan | Использует ETHERSCAN_KEY |
| `EVMSCOPE_SNOWTRACE_KEY` | API-ключ Snowtrace (Avalanche) | Использует ETHERSCAN_KEY |
| `EVMSCOPE_BSCSCAN_KEY` | API-ключ BscScan (BSC) | Использует ETHERSCAN_KEY |
| `EVMSCOPE_ETHPLORER_KEY` | API-ключ Ethplorer (держатели токенов) | `freekey` |
| `EVMSCOPE_LIFI_KEY` | API-ключ LI.FI (маршруты мостов) | Публичный доступ |
| `EVMSCOPE_DEBUG` | Включить отладочное логирование (установить `1`) | Отключено |

## Встроенные базы данных

| База данных | Содержимое |
|-------------|-----------|
| `tokens.json` | 49 основных токенов с адресами в нескольких сетях и идентификаторами CoinGecko |
| `signatures.json` | 36 распространённых сигнатур функций (ERC-20, DEX, кредитование, NFT) |
| `labels.json` | 30 размеченных адресов (биржи, мосты, кошельки китов) |
| `protocols.json` | 10 DeFi-протоколов с адресами контрактов в нескольких сетях |

## Дорожная карта

- **v0.1** (готово) — 5 инструментов: цена, комиссии за транзакции, баланс, информация о токене, ENS
- **v0.5** (готово) — +4 инструмента: decodeTx, getTxStatus, getContractABI, identifyAddress
- **v1.0** (готово) — +5 инструментов: compareGas, getApprovalStatus, getProtocolTVL, getWhaleMovements, getSwapQuote
- **v1.5** (готово) — +6 инструментов: simulateTx, getYieldRates, getTokenHolders, getContractEvents, checkHoneypot, getBridgeRoutes
- **v1.5.1** (готово) — Рефакторинг качества кода и безопасности: 7 новых общих модулей, RPC URL для каждой сети, ограничения размера кэша, унифицированная валидация адресов, модуляризация CLI
- **v1.6.0** (готово) — +3 инструмента: getNFTInfo, getNFTMetadata, getGovernanceProposals. +2 сети: Avalanche, BSC
- **v1.7.0** (готово) — +3 инструмента: getBlockInfo, getTokenTransfers, getPortfolio. Усиление безопасности (v1.6.1)

## Лицензия

[MIT](LICENSE)
