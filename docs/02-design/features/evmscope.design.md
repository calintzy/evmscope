# evmscope Design Document

> **Summary**: AI 에이전트용 EVM 인텔리전스 MCP 툴킷 — 기술 설계
>
> **Project**: evmscope
> **Version**: 0.1.0
> **Author**: ryan
> **Date**: 2026-03-09
> **Status**: Draft
> **Planning Doc**: [evmscope.plan.md](../../01-plan/features/evmscope.plan.md)

---

## 1. Overview

### 1.1 Design Goals

- MCP 서버로서 AI 에이전트(Claude, Cursor 등)에 EVM 블록체인 도구를 제공
- 도구 추가가 파일 1개 추가만으로 가능한 플러그인 아키텍처
- 모든 외부 API 실패 시에도 내장 DB로 기본 동작 보장
- `npx evmscope` 한 줄로 즉시 실행 가능한 zero-config 설계

### 1.2 Design Principles

- **1파일 = 1도구**: 각 도구는 독립적인 단일 파일로 구현
- **Fail-safe**: 외부 API 실패 → 내장 DB 폴백 → 구조화된 에러 반환
- **Zero-config**: 환경변수 전부 선택 사항. 기본값으로 즉시 동작
- **Pure data**: 모든 응답은 구조화된 JSON. 자연어/마크다운 없음
- **Read-only**: 블록체인에 쓰기(write) 기능 절대 없음

---

## 2. Architecture

### 2.1 Component Diagram

```
┌─────────────────────────────────────────────────────┐
│                  AI Agent (Claude, Cursor)            │
│                         │ MCP Protocol (stdio)        │
└─────────────────────────┼───────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────┐
│                   evmscope MCP Server                │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  index.ts — Server Bootstrap                   │  │
│  │  - MCP Server 초기화                           │  │
│  │  - tools/ 디렉토리에서 도구 자동 등록           │  │
│  └──────────────────┬─────────────────────────────┘  │
│                     │                                 │
│  ┌──────────────────▼─────────────────────────────┐  │
│  │  Tools Layer (src/tools/*.ts)                   │  │
│  │                                                 │  │
│  │  getTokenPrice │ getGasPrice │ getBalance       │  │
│  │  getTokenInfo  │ resolveENS  │ ...              │  │
│  │                                                 │  │
│  │  각 도구: input schema → handler → output JSON  │  │
│  └──────────────────┬─────────────────────────────┘  │
│                     │                                 │
│  ┌──────────────────▼─────────────────────────────┐  │
│  │  Shared Layer (src/shared/*.ts)                 │  │
│  │                                                 │  │
│  │  rpc-client.ts  — viem PublicClient (멀티체인)  │  │
│  │  coingecko.ts   — CoinGecko API 래퍼           │  │
│  │  etherscan.ts   — Etherscan API 래퍼 (Phase 2) │  │
│  │  cache.ts       — TTL 기반 in-memory 캐시      │  │
│  └──────────────────┬─────────────────────────────┘  │
│                     │                                 │
│  ┌──────────────────▼─────────────────────────────┐  │
│  │  Data Layer (src/data/*.json)                   │  │
│  │                                                 │  │
│  │  chains.json     — 지원 체인 + RPC 엔드포인트   │  │
│  │  tokens.json     — 주요 토큰 정보               │  │
│  │  protocols.json  — 프로토콜 주소 DB (Phase 2)   │  │
│  │  labels.json     — 주소 라벨 DB (Phase 2)       │  │
│  │  signatures.json — 함수 시그니처 DB (Phase 2)   │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
         │                    │                │
         ▼                    ▼                ▼
   ┌──────────┐       ┌────────────┐    ┌──────────┐
   │ EVM RPC  │       │ CoinGecko  │    │Etherscan │
   │(퍼블릭)  │       │(무료 API)  │    │(무료 API)│
   └──────────┘       └────────────┘    └──────────┘
```

### 2.2 Data Flow

```
AI Agent 요청
  → MCP Protocol (JSON-RPC over stdio)
    → index.ts (도구 라우팅)
      → tools/getTokenPrice.ts (핸들러)
        → shared/cache.ts (캐시 확인)
          → HIT: 캐시된 결과 반환
          → MISS: shared/coingecko.ts (API 호출)
            → 성공: 결과 캐싱 + 반환
            → 실패: data/tokens.json (폴백) 또는 에러 반환
```

### 2.3 Dependencies

| Component | Depends On | Purpose |
|-----------|-----------|---------|
| index.ts | @modelcontextprotocol/sdk, tools/* | MCP 서버 초기화 + 도구 등록 |
| tools/* | shared/*, data/* | 개별 도구 로직 |
| shared/rpc-client | viem, data/chains.json | EVM RPC 호출 |
| shared/coingecko | cache | CoinGecko API + 캐싱 |
| shared/etherscan | cache | Etherscan API + 캐싱 (Phase 2) |
| shared/cache | 없음 (독립) | TTL 기반 Map 캐시 |

---

## 3. Data Model

### 3.1 지원 체인 정의

```typescript
// src/types.ts

interface ChainConfig {
  id: number;            // Chain ID (1, 137, 42161, 8453, 10)
  name: string;          // "ethereum", "polygon", "arbitrum", "base", "optimism"
  rpcUrl: string;        // 퍼블릭 RPC 엔드포인트
  explorerUrl: string;   // 블록 익스플로러 URL
  nativeCurrency: {
    name: string;        // "Ether", "MATIC", "ETH"
    symbol: string;      // "ETH", "MATIC", "ETH"
    decimals: number;    // 18
  };
}

// 기본값: data/chains.json
const SUPPORTED_CHAINS = ["ethereum", "polygon", "arbitrum", "base", "optimism"] as const;
type SupportedChain = typeof SUPPORTED_CHAINS[number];
```

### 3.2 도구 응답 공통 타입

```typescript
// 성공 응답
interface ToolSuccess<T> {
  success: true;
  chain: SupportedChain;
  data: T;
  cached: boolean;       // 캐시 히트 여부
  timestamp: number;     // Unix timestamp (ms)
}

// 에러 응답
interface ToolError {
  success: false;
  error: string;         // 사람이 읽을 수 있는 메시지
  code: ErrorCode;       // 구조화된 에러 코드
}

type ToolResult<T> = ToolSuccess<T> | ToolError;

type ErrorCode =
  | "INVALID_INPUT"       // 입력값 오류
  | "CHAIN_NOT_SUPPORTED" // 미지원 체인
  | "TOKEN_NOT_FOUND"     // 토큰 미발견
  | "API_ERROR"           // 외부 API 실패
  | "RPC_ERROR"           // RPC 호출 실패
  | "RATE_LIMITED"        // Rate limit 초과
  | "ENS_NOT_FOUND";      // ENS 이름 미발견
```

### 3.3 내장 DB 스키마

```typescript
// data/chains.json
interface ChainsData {
  [chainName: string]: ChainConfig;
}

// data/tokens.json — 주요 토큰 정보 (MVP에서 상위 100개)
interface TokenEntry {
  symbol: string;           // "USDC"
  name: string;             // "USD Coin"
  decimals: number;         // 6
  addresses: {
    [chain: string]: string; // { "ethereum": "0xA0b8...", "polygon": "0x2791..." }
  };
  coingeckoId: string;      // "usd-coin"
}

// data/protocols.json (Phase 2)
interface ProtocolEntry {
  name: string;             // "Uniswap V3"
  addresses: {
    [chain: string]: string[];
  };
  category: string;         // "dex", "lending", "bridge"
}

// data/labels.json (Phase 2)
interface LabelEntry {
  address: string;          // "0x..."
  label: string;            // "Binance Hot Wallet"
  category: string;         // "exchange", "whale", "protocol"
  chain: string;            // "ethereum"
}
```

---

## 4. MCP Tool Specification

### 4.1 도구 등록 패턴

```typescript
// src/tools/getTokenPrice.ts — 표준 도구 파일 구조

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// 1. Input Schema (zod)
const inputSchema = z.object({
  token: z.string().describe("토큰 심볼 (ETH, USDC) 또는 contract address"),
  chain: z.enum(SUPPORTED_CHAINS).default("ethereum").describe("EVM 체인"),
});

// 2. Handler
async function handler(input: z.infer<typeof inputSchema>): Promise<ToolResult<TokenPriceData>> {
  // 구현
}

// 3. 도구 등록 함수 (index.ts에서 호출)
export function register(server: McpServer) {
  server.tool(
    "getTokenPrice",
    "토큰의 현재 가격과 24시간 변동률을 조회합니다",
    inputSchema.shape,
    handler
  );
}
```

### 4.2 MVP 도구 상세 설계 (Phase 1)

#### getTokenPrice

| Item | Detail |
|------|--------|
| **Input** | `token` (string, required), `chain` (string, default: "ethereum") |
| **Output** | 현재 가격(USD), 24h 변동률, 시가총액, 거래량 |
| **Data Source** | CoinGecko `/simple/price` API |
| **Fallback** | data/tokens.json에서 coingeckoId 매핑 |
| **Cache TTL** | 30초 |

```typescript
interface TokenPriceData {
  symbol: string;          // "ETH"
  name: string;            // "Ethereum"
  priceUsd: number;        // 1929.20
  change24h: number;       // -2.34 (%)
  marketCap: number;       // 232000000000
  volume24h: number;       // 12500000000
}
```

#### getGasPrice

| Item | Detail |
|------|--------|
| **Input** | `chain` (string, default: "ethereum") |
| **Output** | slow/normal/fast 가스비 (Gwei + USD 예상) |
| **Data Source** | viem `getGasPrice()` + `estimateMaxPriorityFeePerGas()` |
| **Cache TTL** | 15초 |

```typescript
interface GasPriceData {
  slow: GasEstimate;
  normal: GasEstimate;
  fast: GasEstimate;
  baseFee: string;         // Gwei
  lastBlock: number;
}

interface GasEstimate {
  maxFeePerGas: string;       // Gwei
  maxPriorityFeePerGas: string; // Gwei
  estimatedCostUsd: number;   // 기본 전송 (21000 gas) 기준
}
```

#### getBalance

| Item | Detail |
|------|--------|
| **Input** | `address` (string, required), `chain` (string, default: "ethereum"), `tokens` (string[], optional) |
| **Output** | ETH 잔고 + 지정 토큰 잔고 (기본: USDC, USDT, DAI, WETH) |
| **Data Source** | viem `getBalance()` + `readContract()` (ERC-20 balanceOf) |
| **Cache TTL** | 30초 |

```typescript
interface BalanceData {
  address: string;
  nativeBalance: {
    symbol: string;        // "ETH"
    balance: string;       // "1.234567890123456789" (raw)
    balanceFormatted: string; // "1.2346"
    valueUsd: number;      // 2382.50
  };
  tokenBalances: TokenBalance[];
  totalValueUsd: number;
}

interface TokenBalance {
  symbol: string;          // "USDC"
  address: string;         // contract address
  balance: string;         // raw balance
  balanceFormatted: string;
  decimals: number;
  valueUsd: number;
}
```

#### getTokenInfo

| Item | Detail |
|------|--------|
| **Input** | `token` (string, required — 심볼 또는 address), `chain` (string, default: "ethereum") |
| **Output** | 토큰 메타데이터 |
| **Data Source** | viem `readContract()` (ERC-20 name, symbol, decimals, totalSupply) |
| **Fallback** | data/tokens.json |
| **Cache TTL** | 1시간 |

```typescript
interface TokenInfoData {
  address: string;
  name: string;            // "USD Coin"
  symbol: string;          // "USDC"
  decimals: number;        // 6
  totalSupply: string;     // formatted
  chain: SupportedChain;
}
```

#### resolveENS

| Item | Detail |
|------|--------|
| **Input** | `nameOrAddress` (string, required) — ENS 이름 또는 주소 |
| **Output** | 양방향 해석 결과 |
| **Data Source** | viem `getEnsAddress()` / `getEnsName()` |
| **제한** | Ethereum mainnet만 지원 (ENS는 L1 전용) |
| **Cache TTL** | 10분 |

```typescript
interface ENSData {
  name: string | null;     // "vitalik.eth"
  address: string;         // "0xd8dA..."
  avatar: string | null;   // avatar URL (있으면)
  resolved: "name_to_address" | "address_to_name";
}
```

### 4.3 Phase 2 도구 설계 요약

| 도구 | Input | Output | Data Source |
|------|-------|--------|-------------|
| `decodeTx` | txHash, chain | 함수명, 파라미터, 이벤트 로그, 가스 정보 | viem + Etherscan + 4byte |
| `getTxStatus` | txHash, chain | status, receipt, confirmations | viem `getTransactionReceipt()` |
| `getContractABI` | address, chain | ABI JSON | Etherscan → Sourcify → 4byte 폴백 |
| `identifyAddress` | address, chain | 라벨, 카테고리, 프로토콜명 | data/labels.json + data/protocols.json |

---

## 5. Shared Module Design

### 5.1 rpc-client.ts

```typescript
// 멀티체인 viem PublicClient 관리
import { createPublicClient, http } from "viem";
import chains from "../data/chains.json";

// 체인별 클라이언트 싱글턴
const clients: Map<string, PublicClient> = new Map();

export function getClient(chain: SupportedChain = "ethereum"): PublicClient {
  if (!clients.has(chain)) {
    const config = chains[chain];
    if (!config) throw new Error(`Unsupported chain: ${chain}`);
    clients.set(chain, createPublicClient({
      chain: viemChainMap[chain],
      transport: http(process.env.EVMSCOPE_RPC_URL || config.rpcUrl),
    }));
  }
  return clients.get(chain)!;
}
```

### 5.2 cache.ts

```typescript
// TTL 기반 in-memory 캐시
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

export const cache = new Cache();
```

### 5.3 coingecko.ts

```typescript
// CoinGecko 무료 API 래퍼
const BASE_URL = "https://api.coingecko.com/api/v3";

export async function getPrice(coingeckoId: string): Promise<PriceResponse> {
  const cacheKey = `price:${coingeckoId}`;
  const cached = cache.get<PriceResponse>(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
  const res = await fetch(url, {
    headers: apiKey ? { "x-cg-demo-api-key": apiKey } : {},
  });

  if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
  const data = await res.json();

  cache.set(cacheKey, data, 30); // 30초 TTL
  return data;
}

// 심볼 → coingeckoId 매핑 (data/tokens.json 사용)
export function resolveCoingeckoId(symbolOrAddress: string): string | null {
  // tokens.json에서 검색
}
```

---

## 6. Error Handling

### 6.1 에러 코드 정의

| Code | Message | Cause | Handling |
|------|---------|-------|----------|
| `INVALID_INPUT` | 잘못된 입력값 | 잘못된 주소, 심볼 | zod 검증에서 자동 처리 |
| `CHAIN_NOT_SUPPORTED` | 미지원 체인 | 지원하지 않는 체인 요청 | 지원 체인 목록 안내 |
| `TOKEN_NOT_FOUND` | 토큰 미발견 | 존재하지 않는 토큰 | 내장 DB 검색 실패 시 |
| `API_ERROR` | 외부 API 오류 | CoinGecko/Etherscan 장애 | 내장 DB 폴백 시도 |
| `RPC_ERROR` | RPC 호출 실패 | 노드 불안정 | 에러 메시지 전달 |
| `RATE_LIMITED` | Rate limit 초과 | API 호출 과다 | 캐시 TTL 안내 |
| `ENS_NOT_FOUND` | ENS 이름 미발견 | 등록되지 않은 ENS | null 반환 |

### 6.2 에러 응답 형식

```json
{
  "success": false,
  "error": "Token 'FAKECOIN' not found on ethereum",
  "code": "TOKEN_NOT_FOUND"
}
```

### 6.3 폴백 전략

```
외부 API 호출
  → 성공: 결과 캐싱 + 반환
  → Rate Limited: 캐시된 값 있으면 반환 (stale), 없으면 에러
  → 네트워크 에러: 내장 DB 검색 → 있으면 반환, 없으면 에러
```

---

## 7. Security Considerations

- [x] **Read-only 강제**: 블록체인 write 기능 절대 없음 (viem PublicClient만 사용)
- [x] **API 키 미노출**: 환경변수로만 전달, 응답에 포함 안 함
- [x] **입력 검증**: zod 스키마로 모든 입력 검증 (주소 형식, 체인명 등)
- [x] **Rate Limit 보호**: 캐시로 API 호출 최소화
- [ ] **RPC URL 검증**: 사용자 제공 RPC URL의 유효성 확인 (구현 시)
- [x] **프라이빗 키 없음**: 지갑/서명 관련 코드 일체 없음

---

## 8. Test Plan

### 8.1 Test Scope

| Type | Target | Tool | Coverage |
|------|--------|------|----------|
| Unit Test | 각 도구 핸들러 | vitest | 80%+ |
| Unit Test | shared 모듈 (cache, coingecko, rpc-client) | vitest | 90%+ |
| Integration Test | MCP 서버 ↔ 도구 연동 | vitest + MCP test client | 주요 시나리오 |
| Manual Test | Claude Desktop / Cursor에서 실제 호출 | 수동 | MVP 전 도구 |

### 8.2 Test Cases (MVP 도구별)

**getTokenPrice:**
- [x] 유효한 심볼로 가격 조회 ("ETH", "USDC")
- [x] contract address로 가격 조회
- [x] 존재하지 않는 토큰 → TOKEN_NOT_FOUND 에러
- [x] CoinGecko API 실패 시 에러 처리
- [x] 캐시 히트 시 API 미호출 확인

**getGasPrice:**
- [x] 각 지원 체인에서 가스비 조회
- [x] slow < normal < fast 순서 확인
- [x] USD 예상 비용 계산 정확성

**getBalance:**
- [x] ETH 잔고 조회 (실제 주소)
- [x] ERC-20 토큰 잔고 조회
- [x] 0 잔고 주소 처리
- [x] 잘못된 주소 형식 → INVALID_INPUT

**getTokenInfo:**
- [x] ERC-20 컨트랙트에서 메타데이터 조회
- [x] 내장 DB에 있는 토큰 심볼로 조회
- [x] 존재하지 않는 컨트랙트 주소 처리

**resolveENS:**
- [x] 이름 → 주소 해석 ("vitalik.eth")
- [x] 주소 → 이름 역해석
- [x] 존재하지 않는 ENS 이름 → ENS_NOT_FOUND
- [x] Ethereum 이외 체인 요청 시 안내

### 8.3 Mock 전략

| 외부 의존성 | Mock 방식 |
|------------|----------|
| CoinGecko API | vitest mock (msw 또는 fetch mock) |
| EVM RPC | viem test client (anvil/hardhat) 또는 snapshot 응답 |
| Etherscan API | fixture JSON 파일 |

---

## 9. Coding Convention

### 9.1 Naming Conventions

| Target | Rule | Example |
|--------|------|---------|
| 도구 파일 | camelCase.ts (도구명과 동일) | `getTokenPrice.ts` |
| 타입/인터페이스 | PascalCase | `TokenPriceData`, `ToolResult` |
| 함수 | camelCase | `getClient()`, `resolveCoingeckoId()` |
| 상수 | UPPER_SNAKE_CASE | `SUPPORTED_CHAINS`, `DEFAULT_CACHE_TTL` |
| 내장 DB 파일 | kebab-case.json | `chains.json`, `tokens.json` |

### 9.2 Import Order

```typescript
// 1. Node built-in
import { readFileSync } from "node:fs";

// 2. External packages
import { z } from "zod";
import { createPublicClient } from "viem";

// 3. Shared modules
import { cache } from "../shared/cache.js";
import { getClient } from "../shared/rpc-client.js";

// 4. Data
import tokens from "../data/tokens.json";

// 5. Types
import type { ToolResult, SupportedChain } from "../types.js";
```

### 9.3 도구 파일 컨벤션

모든 도구 파일은 동일한 구조를 따름:

```typescript
// 1. Imports
// 2. Input schema (zod)
// 3. Output type definition
// 4. Handler function (async)
// 5. register() export
```

---

## 10. Implementation Guide

### 10.1 File Structure (MVP)

```
evmscope/
├── src/
│   ├── index.ts              # MCP 서버 부트스트랩
│   ├── types.ts              # 공통 타입 정의
│   ├── tools/
│   │   ├── getTokenPrice.ts  # Day 2
│   │   ├── getGasPrice.ts    # Day 3
│   │   ├── getBalance.ts     # Day 3
│   │   ├── getTokenInfo.ts   # Day 4
│   │   └── resolveENS.ts     # Day 4
│   ├── shared/
│   │   ├── rpc-client.ts     # Day 1
│   │   ├── coingecko.ts      # Day 2
│   │   └── cache.ts          # Day 1
│   └── data/
│       ├── chains.json       # Day 1
│       └── tokens.json       # Day 2
├── tests/
│   ├── tools/
│   │   ├── getTokenPrice.test.ts
│   │   ├── getGasPrice.test.ts
│   │   ├── getBalance.test.ts
│   │   ├── getTokenInfo.test.ts
│   │   └── resolveENS.test.ts
│   └── shared/
│       ├── cache.test.ts
│       └── rpc-client.test.ts
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
└── LICENSE
```

### 10.2 Implementation Order

**Day 1 — 기반 구조:**
1. [x] `package.json` + 의존성 (`viem`, `@modelcontextprotocol/sdk`, `zod`, `tsup`, `vitest`)
2. [ ] `tsconfig.json` + `tsup.config.ts` + `vitest.config.ts`
3. [ ] `src/types.ts` — 공통 타입 (ChainConfig, ToolResult, ErrorCode)
4. [ ] `src/data/chains.json` — 5개 체인 RPC 설정
5. [ ] `src/shared/cache.ts` + `tests/shared/cache.test.ts`
6. [ ] `src/shared/rpc-client.ts` + 테스트
7. [ ] `src/index.ts` — MCP 서버 뼈대 (도구 자동 등록 로직)

**Day 2 — 가격/토큰:**
8. [ ] `src/data/tokens.json` — 상위 50개 토큰 정보
9. [ ] `src/shared/coingecko.ts` + 테스트
10. [ ] `src/tools/getTokenPrice.ts` + 테스트

**Day 3 — 가스/잔고:**
11. [ ] `src/tools/getGasPrice.ts` + 테스트
12. [ ] `src/tools/getBalance.ts` + 테스트

**Day 4 — 토큰정보/ENS:**
13. [ ] `src/tools/getTokenInfo.ts` + 테스트
14. [ ] `src/tools/resolveENS.ts` + 테스트

**Day 5 — 배포:**
15. [ ] `README.md` (영문, 설치/사용법/JSON 출력 예시)
16. [ ] `LICENSE` (MIT)
17. [ ] `.github/workflows/ci.yml` (빌드 + 테스트 + npm publish)
18. [ ] npm 배포 테스트 (`npx evmscope`)
19. [ ] Claude Desktop / Cursor 통합 테스트

### 10.3 package.json 핵심 설정

```json
{
  "name": "evmscope",
  "version": "0.1.0",
  "description": "EVM blockchain intelligence toolkit for AI agents (MCP server)",
  "keywords": ["mcp", "evm", "ethereum", "blockchain", "ai-agent", "crypto", "defi"],
  "bin": {
    "evmscope": "./dist/index.js"
  },
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.x",
    "viem": "^2.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "tsup": "^8.x",
    "typescript": "^5.x",
    "vitest": "^3.x"
  },
  "license": "MIT"
}
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-09 | Initial draft | ryan |
