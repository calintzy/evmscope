# evmscope Planning Document

> **Summary**: AI 에이전트용 EVM 블록체인 인텔리전스 MCP 툴킷 (20개 도구 번들)
>
> **Project**: evmscope
> **Version**: 0.1.0
> **Author**: ryan
> **Date**: 2026-03-09
> **Status**: Draft

---

## Executive Summary

| Perspective | Content |
|-------------|---------|
| **Problem** | AI 트레이딩 에이전트가 EVM 블록체인 데이터를 얻으려면 여러 유료 API를 직접 연동하거나, 단일 기능 MCP를 여러 개 설치해야 함 |
| **Solution** | 무료 API 기반 20개 도구를 하나의 MCP 서버로 번들 제공. npx 한 줄 설치, API 키 불필요 |
| **Function/UX Effect** | `npx evmscope` 한 번으로 가격 조회, 가스비, 잔고, 트랜잭션 해석 등 20가지 도구를 AI 에이전트에서 즉시 사용 |
| **Core Value** | 트레이딩 에이전트 스택의 인텔리전스 레이어. "AgentKit으로 실행하고, evmscope로 판단하세요" |

---

## 1. Overview

### 1.1 Purpose

AI 에이전트(Claude, GPT, Gemini 등)가 EVM 블록체인의 시장 데이터를 조회하고, 트랜잭션을 해석하고, 트레이딩 판단에 필요한 정보를 얻을 수 있는 **통합 MCP 툴킷**을 제공한다.

기존 솔루션의 문제점:
- **상용 API (Alchemy, Moralis)**: 유료, API 키 필수, MCP 미지원
- **단일 기능 MCP**: 기능마다 별도 설치 필요 (mcp-crypto-price 등)
- **tx-explain (Eden Network)**: 유료 API 3중 의존, 2⭐ 채택 실패

### 1.2 Background

- DeFAI 시장 $10B+ 성장, AI 에이전트의 온체인 DeFi 거래 비중 20%
- MCP 생태계 급성장 (Claude, Cursor, Windsurf 등 주요 AI 도구 지원)
- 트레이딩 에이전트 스택에서 "오픈소스 + 무료 + MCP 네이티브" 인텔리전스 도구 부재
- Coinbase AgentKit(실행 레이어)의 보완재로 포지셔닝

### 1.3 Related Documents

- 분석: `PROJECT_ANALYSIS.md` (경쟁사 조사, 시장 분석, 피벗 히스토리)

---

## 2. Scope

### 2.1 In Scope (MVP — Phase 1)

- [x] MCP 서버 기본 구조 (index.ts + tools/ 패턴)
- [ ] `getTokenPrice` — 토큰 현재 가격 + 24h 변동률
- [ ] `getGasPrice` — 가스비 (slow/normal/fast)
- [ ] `getBalance` — ETH + ERC-20 토큰 잔고
- [ ] `getTokenInfo` — 토큰 메타데이터 (심볼, 소수점, 총공급)
- [ ] `resolveENS` — ENS 이름 ↔ 주소 양방향 해석
- [ ] npm 패키지 배포 (`npx evmscope`로 즉시 실행)
- [ ] README.md (영문, 설치/사용법/데모)
- [ ] 기본 테스트 (vitest)

### 2.2 In Scope (Phase 2 — v0.5)

- [ ] `decodeTx` — 트랜잭션 구조화 해석
- [ ] `getTxStatus` — 트랜잭션 상태 + receipt
- [ ] `getContractABI` — ABI 자동 조회
- [ ] `identifyAddress` — 주소 라벨 식별

### 2.3 Out of Scope

- 트랜잭션 실행 (write 기능) — Read-only 원칙
- CLI 모드 — v0.5 이후
- npm 라이브러리 모드 — v1.0 이후
- Phase 3~4 도구 (getSwapQuote, getWhaleMovements 등) — 수요 확인 후
- 자연어 출력 — 구조화된 JSON만 제공
- 자체 LLM 호출 — LLM 불필요 원칙

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| FR-01 | `getTokenPrice`: CoinGecko API로 토큰 가격/변동률 조회. 심볼 또는 contract address 입력 지원 | High | MVP |
| FR-02 | `getGasPrice`: viem으로 현재 가스비 조회. slow/normal/fast 3단계 제공 | High | MVP |
| FR-03 | `getBalance`: 지정 주소의 ETH 잔고 + 주요 ERC-20 토큰 잔고 조회 | High | MVP |
| FR-04 | `getTokenInfo`: ERC-20 컨트랙트에서 name, symbol, decimals, totalSupply 조회 | Medium | MVP |
| FR-05 | `resolveENS`: ENS 이름 → 주소, 주소 → ENS 이름 양방향 해석 | Medium | MVP |
| FR-06 | `decodeTx`: 트랜잭션 해시로 함수명, 파라미터, 이벤트 로그를 구조화된 JSON으로 해석 | High | v0.5 |
| FR-07 | `getTxStatus`: 트랜잭션 해시로 상태(pending/success/failed), receipt, 가스 사용량 조회 | High | v0.5 |
| FR-08 | `getContractABI`: Etherscan/Sourcify/4byte.directory에서 ABI 자동 조회 | Medium | v0.5 |
| FR-09 | `identifyAddress`: 내장 DB + Etherscan 라벨로 주소를 프로토콜/거래소/고래로 식별 | Medium | v0.5 |
| FR-10 | 멀티체인 지원: Ethereum, Polygon, Arbitrum, Base, Optimism (chain 파라미터) | High | MVP |
| FR-11 | 응답 캐싱: 동일 요청에 대한 TTL 기반 캐시 (가격: 30초, ABI: 24시간) | Medium | MVP |
| FR-12 | 에러 처리: API 실패 시 내장 DB 폴백 + 구조화된 에러 응답 | Medium | MVP |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement |
|----------|----------|-------------|
| Performance | 도구 응답 시간 < 3초 (네트워크 제외) | vitest 벤치마크 |
| Reliability | 무료 API 장애 시 내장 DB 폴백 | 통합 테스트 |
| Compatibility | Node.js 18+ | CI 매트릭스 |
| Security | Read-only (블록체인 write 불가), API 키 미노출 | 코드 리뷰 |
| Usability | `npx evmscope` 한 줄로 즉시 사용 가능 | 수동 테스트 |

---

## 4. Success Criteria

### 4.1 Definition of Done (MVP)

- [ ] 5개 MCP 도구 모두 정상 동작
- [ ] 5개 EVM 체인 (Ethereum, Polygon, Arbitrum, Base, Optimism) 지원
- [ ] `npx evmscope`로 MCP 서버 즉시 실행 가능
- [ ] Claude Desktop / Cursor에서 도구 호출 테스트 완료
- [ ] npm에 패키지 배포 완료
- [ ] README.md 작성 (영문, 설치/사용법/JSON 출력 예시)
- [ ] MIT 라이선스

### 4.2 Quality Criteria

- [ ] vitest 테스트 커버리지 80% 이상
- [ ] TypeScript strict 모드 빌드 성공
- [ ] ESLint 에러 0개
- [ ] 번들 사이즈 < 500KB (node_modules 제외)

---

## 5. Risks and Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| CoinGecko 무료 Rate Limit (30 req/min) | Medium | High | TTL 캐시 (30초). MCP는 로컬 실행이라 사용자별 분산 |
| Etherscan API 무료 Rate Limit (5 req/sec) | Medium | Medium | 요청 큐잉 + 캐시 (ABI는 24시간). 내장 시그니처 DB 폴백 |
| 4byte.directory 불안정 | Low | Medium | 내장 signatures.json 폴백 |
| viem 버전 호환성 | Low | Low | peerDependencies 명시, CI 테스트 |
| 유사 통합 MCP 선점 | High | Low | 빠른 MVP 출시 (1주). awesome-mcp-servers 즉시 등록 |
| decodeTx 복잡도 과소평가 | Medium | High | Phase 2에 +2주 여유 배분. 기본 ERC-20/스왑만 먼저 지원 |

---

## 6. Architecture Considerations

### 6.1 Project Level Selection

| Level | Characteristics | Recommended For | Selected |
|-------|-----------------|-----------------|:--------:|
| **Starter** | Simple structure | Static sites, portfolios | ☐ |
| **Dynamic** | Feature-based modules, BaaS | Web apps, SaaS MVPs | ☑ |
| **Enterprise** | Strict layer separation, DI | High-traffic systems | ☐ |

> **Dynamic** 선택 이유: 단일 패키지이지만, tools/ 기반 모듈 구조 + 외부 API 연동 + npm 배포가 필요하므로 Starter보다 Dynamic이 적절

### 6.2 Key Architectural Decisions

| Decision | Options | Selected | Rationale |
|----------|---------|----------|-----------|
| Runtime | Node.js | Node.js 18+ | MCP SDK 호환, npm 생태계 |
| Language | TypeScript / JavaScript | TypeScript | 타입 안전, viem 호환 |
| Blockchain | viem / ethers.js / web3.js | viem | 경량, 타입 안전, 트리셰이킹, ethers.js보다 번들 작음 |
| MCP SDK | @modelcontextprotocol/sdk | 공식 SDK | 유일한 공식 옵션 |
| Build | tsup / esbuild / tsc | tsup | ESM + CJS 동시 출력, 빠름 |
| Test | vitest / jest | vitest | TypeScript 네이티브, 빠름 |
| Price API | CoinGecko / CoinMarketCap | CoinGecko 무료 | 무료 티어 충분, 안정적 |
| ABI Source | Etherscan + 4byte + Sourcify | 3중 폴백 | 커버리지 극대화 |
| Cache | in-memory (Map) | 단순 Map + TTL | 외부 의존성 없음. MCP는 프로세스 단위 |

### 6.3 Project Structure

```
evmscope/
├── src/
│   ├── index.ts              # MCP 서버 진입점 (도구 등록)
│   ├── tools/                # 1파일 = 1도구
│   │   ├── getTokenPrice.ts
│   │   ├── getGasPrice.ts
│   │   ├── getBalance.ts
│   │   ├── getTokenInfo.ts
│   │   └── resolveENS.ts
│   ├── shared/               # 공유 인프라
│   │   ├── rpc-client.ts     # viem 퍼블릭 클라이언트 (멀티체인)
│   │   ├── coingecko.ts      # CoinGecko API 래퍼
│   │   ├── etherscan.ts      # Etherscan API 래퍼 (Phase 2)
│   │   └── cache.ts          # TTL 기반 in-memory 캐시
│   └── data/                 # 내장 DB (JSON)
│       ├── tokens.json       # 주요 토큰 정보 (심볼, 주소, 소수점)
│       ├── protocols.json    # 프로토콜 주소 (Uniswap, Aave 등)
│       ├── labels.json       # 주소 라벨 (거래소, 고래 등)
│       └── chains.json       # 지원 체인 RPC 엔드포인트
├── tests/
│   ├── tools/                # 도구별 테스트
│   └── shared/               # 공유 모듈 테스트
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── README.md
├── LICENSE                   # MIT
└── .github/
    └── workflows/
        └── ci.yml            # 빌드 + 테스트 + npm 배포
```

---

## 7. Convention Prerequisites

### 7.1 Coding Conventions

| Category | Rule |
|----------|------|
| Naming | camelCase (변수/함수), PascalCase (타입/인터페이스) |
| Tool 파일명 | 도구명과 동일 (getTokenPrice.ts → getTokenPrice 도구) |
| Export | 각 도구 파일은 `createTool()` 함수를 default export |
| Import order | node built-in → external → shared → data → types |
| Error handling | 구조화된 에러 객체 반환 (`{ error: string, code: string }`) |
| 응답 형식 | 모든 도구는 구조화된 JSON 반환 (자연어 아님) |

### 7.2 Environment Variables

| Variable | Purpose | Required | Default |
|----------|---------|:--------:|---------|
| `EVMSCOPE_RPC_URL` | 커스텀 RPC 엔드포인트 | ❌ | 퍼블릭 RPC |
| `EVMSCOPE_ETHERSCAN_KEY` | Etherscan API 키 (Rate Limit 완화) | ❌ | 무료 티어 |
| `EVMSCOPE_COINGECKO_KEY` | CoinGecko Pro API 키 | ❌ | 무료 티어 |
| `EVMSCOPE_CACHE_TTL` | 캐시 TTL (초) | ❌ | 30 |

> **원칙: 모든 환경변수는 선택 사항.** 아무것도 설정하지 않아도 동작해야 함.

---

## 8. Implementation Order (MVP)

### Week 1: MVP 5개 도구

| Day | Task | Dependencies |
|-----|------|-------------|
| D1 | 프로젝트 초기화 (package.json, tsconfig, tsup, vitest) + MCP 서버 뼈대 (index.ts) + shared/cache.ts | - |
| D1 | shared/rpc-client.ts (viem 멀티체인 클라이언트) + data/chains.json | - |
| D2 | shared/coingecko.ts (CoinGecko API 래퍼) + data/tokens.json | rpc-client |
| D2 | `getTokenPrice` 도구 + 테스트 | coingecko |
| D3 | `getGasPrice` 도구 + 테스트 | rpc-client |
| D3 | `getBalance` 도구 + 테스트 | rpc-client, coingecko |
| D4 | `getTokenInfo` 도구 + 테스트 | rpc-client |
| D4 | `resolveENS` 도구 + 테스트 | rpc-client |
| D5 | README.md 작성 + npm 배포 + CI 설정 | all tools |
| D5 | Claude Desktop / Cursor에서 통합 테스트 | npm 배포 |

### Week 2-3: Phase 2 (v0.5)

| Task | Dependencies |
|------|-------------|
| shared/etherscan.ts + data/signatures.json | - |
| `getTxStatus` 도구 + 테스트 | rpc-client |
| `getContractABI` 도구 + 테스트 | etherscan |
| `identifyAddress` 도구 + 테스트 | data/labels.json, data/protocols.json |
| `decodeTx` 도구 (기본: ERC-20 transfer, approve) | etherscan, rpc-client, identifyAddress |
| `decodeTx` 확장 (DEX swap, multicall) | decodeTx 기본 |
| awesome-mcp-servers PR 제출 | npm 배포 |

---

## 9. Next Steps

1. [ ] Design 문서 작성 (`evmscope.design.md`)
2. [ ] 프로젝트 초기화 (package.json, tsconfig 등)
3. [ ] MVP 구현 시작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-09 | Initial draft | ryan |
