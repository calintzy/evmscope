# evmscope

AI 에이전트를 위한 EVM 블록체인 인텔리전스 툴킷. 가격, 가스, 잔고, 트랜잭션 해석, 주소 식별 등 9개 도구를 제공하는 단일 MCP 서버.

> "AgentKit으로 실행하고, evmscope로 판단하세요."

## 특징

- **9개 도구** — 가격, 가스, 잔고, 토큰 정보, ENS, TX 상태, TX 해석, ABI 조회, 주소 식별
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

## 내장 데이터베이스

| 데이터베이스 | 내용 |
|-------------|------|
| `tokens.json` | 49개 주요 토큰 — 멀티체인 주소 + CoinGecko ID |
| `signatures.json` | 36개 함수 시그니처 — ERC-20, DEX, 렌딩, NFT |
| `labels.json` | 30개 라벨링 주소 — 거래소, 브릿지, 고래 지갑 |
| `protocols.json` | 10개 DeFi 프로토콜 — 멀티체인 컨트랙트 주소 |

## 로드맵

- **v0.1** (완료) — 5개 도구: 가격, 가스, 잔고, 토큰 정보, ENS
- **v0.5** (완료) — +4개 도구: decodeTx, getTxStatus, getContractABI, identifyAddress
- **v1.0** — +5개 도구: getSwapQuote, getApprovalStatus, getProtocolTVL, compareGas, getWhaleMovements
- **v1.5** — +6개 도구: simulateTx, getYieldRates, getTokenHolders, getContractEvents, checkHoneypot, getBridgeRoutes

## 라이선스

[MIT](LICENSE)
