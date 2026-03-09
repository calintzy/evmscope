# evmscope

AI 에이전트를 위한 EVM 블록체인 인텔리전스 툴킷. 토큰 가격, 가스비 비교, 스왑 견적, DeFi 수익률, 허니팟 탐지, 브릿지 경로, TX 시뮬레이션 등 20개 도구를 제공하는 단일 MCP 서버.

> "AgentKit으로 실행하고, evmscope로 판단하세요."

## 특징

- **20개 도구** — 가격, 가스비 비교, 스왑 견적, DeFi 수익률, 허니팟 탐지, 브릿지 경로, TX 시뮬레이션, 이벤트 로그, 토큰 홀더, 승인 상태, TVL, 고래 추적, 잔고, 토큰 정보, ENS, TX 상태, TX 해석, ABI 조회, 주소 식별
- **5개 EVM 체인** — Ethereum, Polygon, Arbitrum, Base, Optimism
- **49개 내장 토큰** — ETH, USDC, USDT, WETH, LINK, UNI, AAVE, ARB, OP, PEPE 등
- **30+ 라벨링 주소** — 거래소, DeFi 프로토콜, 브릿지, 고래 지갑
- **제로 설정** — API 키 불필요. 무료 공개 API로 즉시 동작
- **읽기 전용** — 트랜잭션 실행 기능 없음. 자금 손실 위험 제로
- **내장 폴백** — 토큰/시그니처/라벨 내장 DB로 오프라인 동작 가능

## 빠른 시작

```bash
npx evmscope
```

### CLI 모드

AI 클라이언트 없이 터미널에서 직접 사용할 수 있습니다:

```bash
npx evmscope price ETH
npx evmscope compare-gas
npx evmscope tvl Aave
npx evmscope swap ETH USDC 1.0
npx evmscope balance 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

`npx evmscope --help`로 전체 명령어를 확인하세요. `--json` 플래그로 JSON 출력도 가능합니다.

### Claude Desktop

`claude_desktop_config.json`에 추가:

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

`.cursor/mcp.json`에 추가:

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

## 도구

### getTokenPrice

토큰 현재 가격, 24시간 변동률, 시가총액, 거래량을 조회합니다.

```json
// 입력
{ "token": "ETH", "chain": "ethereum" }

// 출력
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

현재 가스비를 slow/normal/fast 3단계로 USD 예상 비용과 함께 조회합니다.

```json
// 입력
{ "chain": "ethereum" }

// 출력
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

네이티브 토큰 + ERC-20 토큰 잔고를 USD 환산 가치와 함께 조회합니다.

```json
// 입력
{ "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "chain": "ethereum" }

// 출력
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

ERC-20 토큰 메타데이터(이름, 심볼, 소수점, 총공급량)를 조회합니다.

```json
// 입력
{ "token": "USDC", "chain": "ethereum" }

// 출력
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

ENS 이름 <-> 주소를 양방향으로 해석합니다 (Ethereum mainnet 전용).

```json
// 입력
{ "nameOrAddress": "vitalik.eth" }

// 출력
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

트랜잭션 상태, receipt, confirmations, 가스 사용량을 조회합니다.

```json
// 입력
{ "txHash": "0xabc...def", "chain": "ethereum" }

// 출력
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

트랜잭션을 구조화된 JSON으로 해석합니다 — 함수명, 파라미터, 이벤트 로그.

```json
// 입력
{ "txHash": "0xabc...def", "chain": "ethereum" }

// 출력
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

검증된 컨트랙트의 ABI를 조회합니다 (Etherscan -> Sourcify 폴백).

```json
// 입력
{ "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "chain": "ethereum" }

// 출력
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

주소를 식별합니다 — 거래소, DeFi 프로토콜, 고래 지갑, EOA 분류.

```json
// 입력
{ "address": "0x28C6c06298d514Db089934071355E5743bf21d60", "chain": "ethereum" }

// 출력
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

5개 EVM 체인의 가스비를 한 번에 비교합니다. 최저가 순 정렬.

```json
// 입력
{}

// 출력
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

ERC-20 토큰 승인(allowance) 상태를 조회합니다. 주요 DeFi 프로토콜 자동 체크, 리스크 레벨 판정.

```json
// 입력
{ "owner": "0xd8dA...", "token": "USDC", "chain": "ethereum" }

// 출력
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

DeFi 프로토콜의 TVL(Total Value Locked)을 조회합니다 (DefiLlama 기반, 체인별 분포, 24h/7d 변동률).

```json
// 입력
{ "protocol": "Aave" }

// 출력
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

대규모 토큰 전송(고래 이동)을 추적합니다. 거래소 입출금 방향 판정, 요약 통계 포함.

```json
// 입력
{ "token": "USDC", "chain": "ethereum", "minValueUsd": 100000, "limit": 10 }

// 출력
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

DEX 스왑 견적을 조회합니다 (ParaSwap 기반, 최적 경로, 가스비 포함, ETH→WETH 자동 치환).

```json
// 입력
{ "tokenIn": "ETH", "tokenOut": "USDC", "amountIn": "1.0", "chain": "ethereum" }

// 출력
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

DeFi 수익률(APY)을 조회합니다 (DefiLlama 기반, 프로토콜/체인별 필터).

```json
// 입력
{ "protocol": "aave-v3", "chain": "Ethereum", "minTvl": 1000000 }

// 출력
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

컨트랙트 이벤트 로그를 조회합니다 (ABI 자동 디코딩).

```json
// 입력
{ "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "chain": "ethereum", "limit": 5 }

// 출력
{
  "success": true,
  "data": {
    "events": [
      { "name": "Transfer", "args": { "from": "0x...", "to": "0x...", "value": "1000000" }, "txHash": "0x...", "blockNumber": 19234567 }
    ],
    "count": 5
  }
}
```

### getTokenHolders

토큰 상위 홀더를 조회합니다 (Ethereum: Ethplorer, 기타 체인: Etherscan 집계).

```json
// 입력
{ "token": "USDC", "chain": "ethereum", "limit": 10 }

// 출력
{
  "success": true,
  "data": {
    "holders": [
      { "address": "0x...", "balance": "1000000", "share": 15.5 }
    ],
    "totalHolders": 12345
  }
}
```

### simulateTx

트랜잭션을 시뮬레이션합니다 (eth_call + estimateGas, 가스비 USD 환산, revert reason 디코딩).

```json
// 입력
{ "from": "0x1234...", "to": "0x5678...", "data": "0xa9059cbb...", "chain": "ethereum" }

// 출력
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

토큰의 허니팟(사기) 여부를 탐지합니다 (Honeypot.is 기반, 매수/매도 세금, 위험도 판정).

```json
// 입력
{ "token": "0x...", "chain": "ethereum" }

// 출력
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

크로스체인 브릿지 경로를 조회합니다 (LI.FI 기반, 비용/시간/경로 비교).

```json
// 입력
{ "fromChain": "ethereum", "toChain": "arbitrum", "token": "USDC", "amount": "100" }

// 출력
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

## 지원 체인

| 체인 | Chain ID | 네이티브 토큰 |
|------|----------|--------------|
| Ethereum | 1 | ETH |
| Polygon | 137 | POL |
| Arbitrum | 42161 | ETH |
| Base | 8453 | ETH |
| Optimism | 10 | ETH |

## 환경변수 (선택사항)

모든 환경변수는 선택사항입니다. evmscope는 설정 없이 즉시 동작합니다.

| 변수 | 용도 | 기본값 |
|------|------|--------|
| `EVMSCOPE_RPC_URL` | 커스텀 RPC 엔드포인트 | 공개 RPC |
| `EVMSCOPE_COINGECKO_KEY` | CoinGecko API 키 (높은 Rate Limit) | 무료 티어 |
| `EVMSCOPE_ETHERSCAN_KEY` | Etherscan API 키 (높은 Rate Limit) | 무료 티어 |
| `EVMSCOPE_POLYGONSCAN_KEY` | Polygonscan API 키 | ETHERSCAN_KEY 폴백 |
| `EVMSCOPE_ARBISCAN_KEY` | Arbiscan API 키 | ETHERSCAN_KEY 폴백 |
| `EVMSCOPE_BASESCAN_KEY` | Basescan API 키 | ETHERSCAN_KEY 폴백 |
| `EVMSCOPE_OPTIMISTIC_KEY` | Optimistic Etherscan API 키 | ETHERSCAN_KEY 폴백 |
| `EVMSCOPE_ETHPLORER_KEY` | Ethplorer API 키 (토큰 홀더) | `freekey` |
| `EVMSCOPE_LIFI_KEY` | LI.FI API 키 (브릿지 경로) | 공개 접근 |

## 내장 데이터베이스

| 데이터베이스 | 내용 |
|-------------|------|
| `tokens.json` | 49개 주요 토큰 — 멀티체인 주소 + CoinGecko ID |
| `signatures.json` | 36개 함수 시그니처 — ERC-20, DEX, 렌딩, NFT |
| `labels.json` | 30개 라벨링 주소 — 거래소, 브릿지, 고래 지갑 |
| `protocols.json` | 10개 DeFi 프로토콜 — 멀티체인 컨트랙트 주소 |

## 로드맵

- **v0.1** (완료) — 5개 도구: 가격, 트랜잭션 수수료, 잔고, 토큰 정보, ENS
- **v0.5** (완료) — +4개 도구: decodeTx, getTxStatus, getContractABI, identifyAddress
- **v1.0** (완료) — +5개 도구: compareGas, getApprovalStatus, getProtocolTVL, getWhaleMovements, getSwapQuote
- **v1.5** (완료) — +6개 도구: simulateTx, getYieldRates, getTokenHolders, getContractEvents, checkHoneypot, getBridgeRoutes

## 라이선스

[MIT](LICENSE)
