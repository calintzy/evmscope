# evmscope

[English](README.md) | [한국어](README-ko.md) | [中文](README-zh.md) | [日本語](README-ja.md) | [Русский](README-ru.md)

Kit de inteligencia para blockchain EVM. 26 herramientas en 7 cadenas — úselo como CLI o servidor MCP. Precio del token, comparación de gas, cotización de swap, tasas de rendimiento, detección de honeypot, rutas de puente, simulación de transacciones, consulta de NFT, propuestas de gobernanza, seguimiento de portafolio, y más.

## Características

- **26 herramientas** — Precio, comparación de gas, cotización de swap, tasas de rendimiento, detección de honeypot, rutas de puente, simulación de transacciones, registros de eventos, poseedores de tokens, estado de aprobación, TVL, seguimiento de ballenas, saldo, información de token, ENS, estado de transacción, decodificación de transacción, consulta de ABI, identificación de dirección, información de NFT, metadatos de NFT, propuestas de gobernanza, información de bloque, transferencias de tokens, portafolio
- **7 cadenas EVM** — Ethereum, Polygon, Arbitrum, Base, Optimism, Avalanche, BSC
- **49 tokens integrados** — ETH, USDC, USDT, WETH, LINK, UNI, AAVE, ARB, OP, PEPE, y más
- **Más de 30 direcciones etiquetadas** — Exchanges, protocolos DeFi, puentes, carteras de ballenas
- **Cero configuración** — No se requieren claves API. Funciona de inmediato con APIs públicas gratuitas
- **Solo lectura** — Sin ejecución de transacciones. Cero riesgo de pérdida de fondos
- **Modo dual** — CLI para uso directo en terminal, servidor MCP para integración con agentes de IA

## Inicio Rápido

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

Ejecute `npx evmscope --help` para ver los 22 comandos disponibles. Agregue `--json` para obtener salida en JSON sin formato.

### Servidor MCP

Inicie como servidor MCP (sin argumentos):

```bash
npx evmscope
```

### Claude Code

```bash
claude mcp add evmscope -- npx -y evmscope
```

### Claude Desktop

Agregue a `claude_desktop_config.json`:

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

Agregue a `.cursor/mcp.json`:

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

## Herramientas

### getTokenPrice

Obtiene el precio actual del token, cambio en 24h, capitalización de mercado y volumen.

```json
// Entrada
{ "token": "ETH", "chain": "ethereum" }

// Salida
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

Obtiene los precios de gas actuales en niveles lento/normal/rápido con estimaciones en USD.

```json
// Entrada
{ "chain": "ethereum" }

// Salida
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

Obtiene saldos del token nativo y tokens ERC-20 con valores en USD.

```json
// Entrada
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum" }

// Salida
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

Obtiene metadatos del token ERC-20 (nombre, símbolo, decimales, suministro total).

```json
// Entrada
{ "token": "USDC", "chain": "ethereum" }

// Salida
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

Resuelve nombres ENS a direcciones y viceversa (solo red principal de Ethereum).

```json
// Entrada
{ "nameOrAddress": "vitalik.eth" }

// Salida
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

Obtiene el estado de la transacción, recibo, confirmaciones y uso de gas.

```json
// Entrada
{ "txHash": "0xabc...def", "chain": "ethereum" }

// Salida
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

Decodifica una transacción en JSON estructurado — nombre de función, parámetros, registros de eventos.

```json
// Entrada
{ "txHash": "0xabc...def", "chain": "ethereum" }

// Salida
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

Consulta el ABI de un contrato verificado (Etherscan con Sourcify como respaldo).

```json
// Entrada
{ "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "chain": "ethereum" }

// Salida
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

Identifica una dirección — exchange, protocolo DeFi, cartera de ballena o EOA.

```json
// Entrada
{ "address": "0x28C6c06298d514Db089934071355E5743bf21d60", "chain": "ethereum" }

// Salida
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

Compara las comisiones de gas en las 7 cadenas EVM a la vez, ordenadas de menor a mayor costo.

```json
// Entrada
{}

// Salida
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

Verifica el estado de aprobación (allowance) de tokens ERC-20. Comprueba automáticamente los principales protocolos DeFi con evaluación del nivel de riesgo.

```json
// Entrada
{ "owner": "0xd8dA...", "token": "USDC", "chain": "ethereum" }

// Salida
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

Obtiene el TVL (Valor Total Bloqueado) de un protocolo DeFi mediante DefiLlama — desglose por cadena, cambios en 24h/7d.

```json
// Entrada
{ "protocol": "Aave" }

// Salida
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

Rastrea grandes transferencias de tokens (movimientos de ballenas). Clasifica la dirección de depósito/retiro en exchanges.

```json
// Entrada
{ "token": "USDC", "chain": "ethereum", "minValueUsd": 100000, "limit": 10 }

// Salida
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

Obtiene cotizaciones de swap en DEX mediante ParaSwap — ruta óptima, costo de gas, conversión automática ETH→WETH.

```json
// Entrada
{ "tokenIn": "ETH", "tokenOut": "USDC", "amountIn": "1.0", "chain": "ethereum" }

// Salida
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

Obtiene tasas de rendimiento DeFi (APY) de DefiLlama. Filtre por protocolo, cadena y TVL mínimo.

```json
// Entrada
{ "protocol": "aave-v3", "chain": "Ethereum", "minTvl": 1000000 }

// Salida
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

Obtiene registros de eventos de contratos con decodificación automática de ABI.

```json
// Entrada
{ "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "chain": "ethereum", "limit": 5 }

// Salida
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

Obtiene los principales poseedores de un token. Ethereum usa Ethplorer; otras cadenas agregan datos desde transferencias de Etherscan.

```json
// Entrada
{ "token": "USDC", "chain": "ethereum", "limit": 10 }

// Salida
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

Simula una transacción mediante eth_call + estimateGas. Devuelve la estimación de gas en USD y el motivo de reversión en caso de fallo.

```json
// Entrada
{ "from": "0x1234...", "to": "0x5678...", "data": "0xa9059cbb...", "chain": "ethereum" }

// Salida
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

Detecta tokens honeypot (estafa) mediante Honeypot.is. Devuelve impuesto de compra/venta, nivel de riesgo y alertas.

```json
// Entrada
{ "token": "0x...", "chain": "ethereum" }

// Salida
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

Obtiene rutas de puente entre cadenas mediante LI.FI. Compara comisiones, tiempo y monto de salida.

```json
// Entrada
{ "fromChain": "ethereum", "toChain": "arbitrum", "token": "USDC", "amount": "100" }

// Salida
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

Obtiene el saldo ERC-721 y la lista de tokens de una cartera.

```json
// Entrada
{ "address": "0xd8dA...", "contractAddress": "0x...", "chain": "ethereum" }

// Salida
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

Obtiene los metadatos de un token NFT específico (nombre, imagen, atributos).

```json
// Entrada
{ "contractAddress": "0x...", "tokenId": "1234", "chain": "ethereum" }

// Salida
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

Obtiene propuestas de gobernanza desde Snapshot (activas, cerradas o todas).

```json
// Entrada
{ "protocol": "uniswap", "state": "active" }

// Salida
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

Detalles del bloque (marca de tiempo, gas, transacciones, validador) por número o el más reciente.

```json
// Entrada
{ "blockNumber": 19234567, "chain": "ethereum" }

// Salida
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

Historial reciente de transferencias de tokens ERC-20 para una dirección de cartera.

```json
// Entrada
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum", "limit": 5 }

// Salida
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

Portafolio completo de la cartera con saldos nativos y ERC-20, y valores en USD.

```json
// Entrada
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum" }

// Salida
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

## Cadenas Compatibles

| Cadena | Chain ID | Token Nativo |
|--------|----------|--------------|
| Ethereum | 1 | ETH |
| Polygon | 137 | POL |
| Arbitrum | 42161 | ETH |
| Base | 8453 | ETH |
| Optimism | 10 | ETH |
| Avalanche | 43114 | AVAX |
| BSC | 56 | BNB |

## Variables de Entorno (Opcionales)

Todas las variables de entorno son opcionales. evmscope funciona sin ninguna configuración.

| Variable | Propósito | Valor por defecto |
|----------|-----------|-------------------|
| `EVMSCOPE_RPC_URL` | Endpoint RPC personalizado (todas las cadenas) | RPC público |
| `EVMSCOPE_RPC_URL_ETHEREUM` | Endpoint RPC específico para Ethereum | Usa RPC_URL como respaldo |
| `EVMSCOPE_RPC_URL_POLYGON` | Endpoint RPC específico para Polygon | Usa RPC_URL como respaldo |
| `EVMSCOPE_RPC_URL_ARBITRUM` | Endpoint RPC específico para Arbitrum | Usa RPC_URL como respaldo |
| `EVMSCOPE_RPC_URL_BASE` | Endpoint RPC específico para Base | Usa RPC_URL como respaldo |
| `EVMSCOPE_RPC_URL_OPTIMISM` | Endpoint RPC específico para Optimism | Usa RPC_URL como respaldo |
| `EVMSCOPE_RPC_URL_AVALANCHE` | Endpoint RPC específico para Avalanche | Usa RPC_URL como respaldo |
| `EVMSCOPE_RPC_URL_BSC` | Endpoint RPC específico para BSC | Usa RPC_URL como respaldo |
| `EVMSCOPE_COINGECKO_KEY` | Clave API de CoinGecko (límites de tasa más altos) | Nivel gratuito |
| `EVMSCOPE_ETHERSCAN_KEY` | Clave API de Etherscan (límites de tasa más altos) | Nivel gratuito |
| `EVMSCOPE_POLYGONSCAN_KEY` | Clave API de Polygonscan | Usa ETHERSCAN_KEY como respaldo |
| `EVMSCOPE_ARBISCAN_KEY` | Clave API de Arbiscan | Usa ETHERSCAN_KEY como respaldo |
| `EVMSCOPE_BASESCAN_KEY` | Clave API de Basescan | Usa ETHERSCAN_KEY como respaldo |
| `EVMSCOPE_OPTIMISTIC_KEY` | Clave API de Optimistic Etherscan | Usa ETHERSCAN_KEY como respaldo |
| `EVMSCOPE_SNOWTRACE_KEY` | Clave API de Snowtrace (Avalanche) | Usa ETHERSCAN_KEY como respaldo |
| `EVMSCOPE_BSCSCAN_KEY` | Clave API de BscScan (BSC) | Usa ETHERSCAN_KEY como respaldo |
| `EVMSCOPE_ETHPLORER_KEY` | Clave API de Ethplorer (poseedores de tokens) | `freekey` |
| `EVMSCOPE_LIFI_KEY` | Clave API de LI.FI (rutas de puente) | Acceso público |
| `EVMSCOPE_DEBUG` | Habilita el registro de depuración (establecer en `1`) | Deshabilitado |

## Bases de Datos Integradas

| Base de datos | Contenido |
|---------------|-----------|
| `tokens.json` | 49 tokens principales con direcciones en múltiples cadenas e IDs de CoinGecko |
| `signatures.json` | 36 firmas de funciones comunes (ERC-20, DEX, préstamos, NFT) |
| `labels.json` | 30 direcciones etiquetadas (exchanges, puentes, carteras de ballenas) |
| `protocols.json` | 10 protocolos DeFi con direcciones de contratos en múltiples cadenas |

## Hoja de Ruta

- **v0.1** (completado) — 5 herramientas: price, transaction fees, balance, token info, ENS
- **v0.5** (completado) — +4 herramientas: decodeTx, getTxStatus, getContractABI, identifyAddress
- **v1.0** (completado) — +5 herramientas: compareGas, getApprovalStatus, getProtocolTVL, getWhaleMovements, getSwapQuote
- **v1.5** (completado) — +6 herramientas: simulateTx, getYieldRates, getTokenHolders, getContractEvents, checkHoneypot, getBridgeRoutes
- **v1.5.1** (completado) — Calidad de código y refactorización de seguridad: 7 nuevos módulos compartidos, URLs de RPC por cadena, límites de tamaño de caché, validación de direcciones unificada, modularización del CLI
- **v1.6.0** (completado) — +3 herramientas: getNFTInfo, getNFTMetadata, getGovernanceProposals. +2 cadenas: Avalanche, BSC
- **v1.7.0** (completado) — +3 herramientas: getBlockInfo, getTokenTransfers, getPortfolio. Refuerzo de seguridad (v1.6.1)

## Licencia

[MIT](LICENSE)
