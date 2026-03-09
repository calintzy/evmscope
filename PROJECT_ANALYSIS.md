# evmscope 프로젝트 분석 문서

> 작성일: 2026-03-09 (최종 업데이트: 2026-03-09)
> 분석 방법: Agent Council (Claude + Gemini) 2회 + 웹 검색 + GitHub API + npm 레지스트리 조사
> 프로젝트명 확정: **evmscope** (npm + GitHub 모두 미점유 확인 완료)

---

## 1. 프로젝트 개요

### 한 줄 요약

**AI 에이전트가 EVM 블록체인을 이해하고 판단하기 위한 인텔리전스 MCP 툴킷**

### 포지셔닝

> "AgentKit으로 실행하고, evmscope로 판단하세요"

트레이딩 에이전트 스택에서 **인텔리전스 레이어**를 담당:

```
🧠 LLM (Claude, GPT)     ← 판단
     ↕
📊 evmscope               ← 데이터 (시장 관찰, 분석, 해석)
     ↕
💰 AgentKit               ← 실행 (트랜잭션, 스왑)
```

### 핵심 원칙

1. **Read-only** — 실행(write) 없음. 데이터 관찰/분석만. 자금 손실 리스크 0
2. **API 키 불필요** — 무료 API + 내장 DB로 기본 동작
3. **MCP 우선** — MCP 서버로 시작. CLI/라이브러리는 성장 후 추가
4. **LLM 불필요** — 구조화된 JSON 출력. AI 없이 동작, LLM이 직접 해석

### 타겟 사용자

| 사용자 유형 | 사용 방식 | 핵심 가치 |
|------------|----------|----------|
| AI 에이전트 개발자 | MCP 서버 연동 | 트레이딩 판단에 필요한 데이터를 도구 하나로 |
| 크립토 트레이더 | CLI로 빠른 조회 | 터미널에서 즉시 시장 데이터 확인 |
| DeFi 개발자 | 라이브러리 임포트 | 프로젝트에 EVM 데이터 레이어 추가 |

### 제공 형태 (단계적)

| 단계 | 형태 | 설치 | 타겟 |
|------|------|------|------|
| MVP | MCP 서버 | `npx evmscope` | AI 에이전트 사용자 |
| v0.5 | + CLI | `npx evmscope-cli` | 터미널 사용자 |
| v1.0 | + 라이브러리 | `npm install evmscope` | 개발자 |

---

## 2. 시장 기회: 왜 지금인가

### 에이전트 트레이딩 시장 데이터

| 지표 | 수치 |
|------|------|
| AI 크립토 시장 규모 | $29.5B (2025.08) |
| AI 에이전트 프로젝트 수 | 550+개 |
| DeFAI 시장 성장 | $1B → $10B (2025년 내) |
| AI의 온체인 DeFi 거래 비중 | 20% (2025년) |
| x402 프로토콜 | 2026년 AI 에이전트 전용 결제 표준 등장 |

### 트레이딩 에이전트 스택의 빈 자리

| 레이어 | 역할 | 대표 프로젝트 | 포화도 |
|--------|------|-------------|--------|
| 트레이딩 봇 | 전략 실행 | Freqtrade (39.9K⭐) | 🔴 포화 |
| 실행 레이어 | 지갑, 서명, 트랜잭션 | AgentKit (1,137⭐) | 🔴 지배적 |
| **인텔리전스 레이어** | **시장 데이터, 분석** | **?** | **🟢 빈 자리** |

> **정확한 포지셔닝:** "인텔리전스 레이어 전체"가 비어있는 것은 아닙니다.
> Alchemy, Moralis, Dune Analytics, TheGraph 등 상용 데이터 플랫폼이 존재합니다.
> 비어있는 것은 **"오픈소스 + 무료 + MCP 네이티브 + npx 한 줄 설치"를 동시에 만족하는 AI 에이전트용 EVM 인텔리전스 도구**입니다.

### MCP 생태계 성장

- Claude, Cursor, Windsurf, Gemini 등 주요 AI 도구가 MCP 지원
- awesome-mcp-servers 리스트 급성장
- 크립토 분야 MCP는 아직 초기 (단일 기능 MCP 위주)

---

## 3. 경쟁 환경 분석

### 3.1 상용 인텔리전스 플랫폼 (간접 경쟁)

| 플랫폼 | 형태 | 가격 | MCP 지원 | evmscope와의 차이 |
|--------|------|------|---------|-------------------|
| Alchemy | 상용 API | 유료 (무료 티어 제한적) | ❌ | 기업용. API 키 필수. MCP 없음 |
| Moralis | 상용 API | 유료 | ❌ | 기업용. 개인 개발자에겐 과도 |
| Dune Analytics | 상용 플랫폼 | 유료 | ❌ | SQL 기반 쿼리. 실시간 아님 |
| TheGraph | 탈중앙 인덱서 | GRT 토큰 소비 | ❌ | 서브그래프 작성 필요. 진입장벽 높음 |
| CoinGecko | 무료 API | 무료 (Rate limit) | ✅ 공식 MCP | 가격 데이터만. 통합 툴킷 아님 |

**핵심:** 이들은 강력하지만 **유료이거나, MCP 미지원이거나, 단일 기능**입니다. evmscope는 이들의 무료 데이터를 **통합하여 MCP로 제공**하는 접근입니다.

### 3.2 크립토 MCP 서버 (직접 경쟁)

| 프로젝트 | Stars | 도구 수 | 특징 | 차이점 |
|---------|-------|--------|------|--------|
| GOAT SDK | 964⭐ | 다수 | 멀티체인 AI 프레임워크 | 실행(write) 포함. 지갑 기능 중심. Read-only 아님 |
| Solana Agent Kit | 1,623⭐ | 다수 | Solana 전용 | EVM 미지원 |
| Bankless/onchain-mcp | 73⭐ | 소수 | 범용 온체인 MCP | EVM 특화 아님. 도구 수 적음 |
| mcp-crypto-price | 38⭐ | 1개 | 가격 조회만 | 단일 기능 |
| CoinGecko 공식 MCP | — | 소수 | 가격/시장 데이터 | CoinGecko 데이터만 |

**evmscope의 차별점:**
- **20개 도구 번들** — 단일 기능 MCP 대비 압도적 도구 수
- **Read-only** — GOAT/AgentKit과 달리 데이터만. 보완재 관계
- **EVM 특화** — Solana Kit과 겹치지 않음
- **무료 + npx 한 줄** — 진입장벽 최저

### 3.3 실패 사례 분석: tx-explain (Eden Network)

| 항목 | 상세 |
|------|------|
| 프로젝트 | [eden-network/tx-explain](https://github.com/eden-network/tx-explain) |
| Stars | 2⭐ (채택 실패) |
| 상태 | 5개월 방치, 14개 미해결 이슈 |
| 언어 | Python |
| 문제점 | Tenderly + Anthropic + GCS **3개 유료 API 필수** |

**tx-explain의 실패에서 배운 4가지 설계 원칙:**

1. **무료여야 한다** — 유료 API 의존 = 채택 실패
2. **쉬워야 한다** — Python + GCS 인증 = 진입장벽 과다
3. **어디서든 써야 한다** — MCP/CLI/라이브러리 다중 배포
4. **API 키 없이도 동작해야 한다** — 내장 DB + 무료 API 폴백

### 3.4 검토 후 탈락한 아이디어들

| 아이디어 | 경쟁 강도 | 탈락 사유 |
|---------|----------|----------|
| crypto-mcp (범용) | 🔴 높음 | GOAT SDK (964⭐), CoinGecko 공식 MCP |
| Solidity Sentinel (보안) | 🔴 높음 | Slither (6,160⭐), Mythril (3,500+⭐) |
| agent-wallet (지갑) | 🔴 높음 | Coinbase AgentKit (1,137⭐) 지배적 |
| DeFi Yield Hunter | 🟡 중간 | DeFiLlama 무료 API 존재 |

---

## 4. evmscope 솔루션

### 4.1 핵심 가치: 20개 도구 번들

단일 기능 MCP가 난립하는 시장에서, **하나만 설치하면 EVM 데이터 전부를 커버**하는 통합 툴킷:

```json
{
  "mcpServers": {
    "evmscope": {
      "command": "npx",
      "args": ["evmscope"]
    }
  }
}
```

이 설정 하나로 20개 도구를 AI 에이전트에서 즉시 사용 가능.

### 4.2 도구 전체 목록

| # | 도구명 | 카테고리 | 설명 |
|---|--------|---------|------|
| 1 | `getTokenPrice` | 기본 조회 | 현재 가격 + 24h 변동률 |
| 2 | `getGasPrice` | 기본 조회 | 가스비 (slow/normal/fast) |
| 3 | `getBalance` | 기본 조회 | ETH + 주요 토큰 잔고 |
| 4 | `getTokenInfo` | 기본 조회 | 토큰 메타데이터 (심볼, 소수점, 총공급) |
| 5 | `resolveENS` | 기본 조회 | ENS 이름 ↔ 주소 양방향 해석 |
| 6 | `decodeTx` | 트랜잭션 | 트랜잭션 → 구조화된 해석 (JSON) |
| 7 | `getTxStatus` | 트랜잭션 | 트랜잭션 상태 + receipt |
| 8 | `getContractABI` | 트랜잭션 | ABI 자동 조회 (Etherscan/Sourcify/4byte) |
| 9 | `identifyAddress` | 트랜잭션 | 주소 → 라벨 (프로토콜/거래소/고래) |
| 10 | `getSwapQuote` | 트레이딩 | 스왑 견적 (최적 라우팅) |
| 11 | `getPoolLiquidity` | 트레이딩 | DEX 풀 유동성 분석 |
| 12 | `getPriceHistory` | 트레이딩 | 가격 히스토리 (1h~30d) |
| 13 | `getWhaleMovements` | 트레이딩 | 대량 전송 감지 |
| 14 | `checkApprovals` | 트레이딩 | 토큰 승인 현황 + 위험 감지 |
| 15 | `comparePrices` | 고급 분석 | DEX 간 가격 차이 (아비트라지 기회) |
| 16 | `estimateSlippage` | 고급 분석 | 슬리피지 예측 |
| 17 | `getTopHolders` | 고급 분석 | 상위 홀더 분포 |
| 18 | `getTrendingTokens` | 고급 분석 | 급등 토큰 탐지 |
| 19 | `getFundingRates` | 고급 분석 | 무기한 선물 펀딩레이트 |
| 20 | `getPortfolioSummary` | 고급 분석 | 전체 포트폴리오 요약 |

### 4.3 차별화 요약

| 관점 | 기존 단일 MCP | 상용 API (Alchemy 등) | evmscope |
|------|-------------|---------------------|----------|
| 도구 수 | 1~3개 | 다수 (유료) | **20개 (무료)** |
| 설치 | 개별 설치 | API 키 + SDK 설정 | **npx 한 줄** |
| 비용 | 무료 | 월 $49~$399 | **무료** |
| MCP 지원 | ✅ | ❌ (대부분) | **✅ 네이티브** |
| 기여 용이성 | 프로젝트마다 상이 | 불가 | **파일 1개 = 도구 1개 PR** |
| 실행(write) | 포함 가능 | 포함 | **Read-only (안전)** |

---

## 5. 기능 로드맵

### Phase 1: 기본 조회 — MVP (1주)

| # | 도구 | 핵심 API | 복잡도 |
|---|------|---------|--------|
| 1 | `getTokenPrice` | CoinGecko | 낮음 |
| 2 | `getGasPrice` | viem (RPC) | 낮음 |
| 3 | `getBalance` | viem (RPC) + CoinGecko | 낮음 |
| 4 | `getTokenInfo` | viem (ERC-20 contract call) | 낮음 |
| 5 | `resolveENS` | viem (ENS) | 낮음 |

**목표:** npm 배포 + awesome-mcp-servers 등록. 설치 후 10초 내 가치 체험.

### Phase 2: 트랜잭션 해석 — v0.5 (+2주)

| # | 도구 | 핵심 API | 복잡도 |
|---|------|---------|--------|
| 6 | `decodeTx` | Etherscan + 4byte + viem | **높음** |
| 7 | `getTxStatus` | viem (RPC) | 낮음 |
| 8 | `getContractABI` | Etherscan + Sourcify | 중간 |
| 9 | `identifyAddress` | 내장 DB + Etherscan | 중간 |

> `decodeTx`는 ABI 자동 해석, 프로토콜 식별, 이벤트 로그 파싱 등 복잡도가 높아 +1주 여유 배분.

### Phase 3: 트레이딩 인텔리전스 — 커뮤니티 피드백 기반

| # | 도구 | 복잡도 | 비고 |
|---|------|--------|------|
| 10 | `getSwapQuote` | **높음** | DEX Aggregator API 연동 필요 |
| 11 | `getPoolLiquidity` | 중간 | Uniswap V3 서브그래프 |
| 12 | `getPriceHistory` | 낮음 | CoinGecko 히스토리 API |
| 13 | `getWhaleMovements` | **높음** | 대량 전송 감지 파이프라인 |
| 14 | `checkApprovals` | 중간 | ERC-20 allowance 조회 |

> Phase 3~4는 확정 일정 없음. MVP/v0.5 사용자 피드백과 수요를 보고 우선순위 결정.

### Phase 4: 고급 분석 — 수요 확인 후 결정

| # | 도구 | 복잡도 | 비고 |
|---|------|--------|------|
| 15 | `comparePrices` | 중간 | 다중 DEX 가격 비교 |
| 16 | `estimateSlippage` | **높음** | 유동성 기반 계산 |
| 17 | `getTopHolders` | 중간 | Etherscan 토큰 홀더 API |
| 18 | `getTrendingTokens` | 중간 | CoinGecko trending |
| 19 | `getFundingRates` | 중간 | CEX API 연동 |
| 20 | `getPortfolioSummary` | 중간 | 기존 도구 조합 |

### 일정 요약

| 마일스톤 | 도구 수 | 기간 | 확정 여부 |
|---------|--------|------|----------|
| **MVP (v0.1)** | 5개 | 1주 | ✅ 확정 |
| **v0.5** | +4개 (총 9개) | +2주 | ✅ 확정 |
| **v1.0** | +5개 (총 14개) | 피드백 기반 | ⏳ 유동적 |
| **v1.5** | +6개 (총 20개) | 수요 확인 후 | ⏳ 유동적 |
| **v2.0** | CLI + 라이브러리 분리 | 성장 후 | ⏳ 유동적 |

---

## 6. 기술 설계

### 6.1 아키텍처

```
┌─────────────────────────────────────────────────┐
│                    evmscope                      │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │  MCP Server (index.ts)                   │    │
│  │  - 도구 등록 / 요청 라우팅               │    │
│  └─────────────┬────────────────────────────┘    │
│                │                                  │
│  ┌─────────────▼────────────────────────────┐    │
│  │  Tools Layer (tools/*.ts)                │    │
│  │  1파일 = 1도구. 독립적으로 동작           │    │
│  │  getTokenPrice / getGasPrice / ...       │    │
│  └─────────────┬────────────────────────────┘    │
│                │                                  │
│  ┌─────────────▼────────────────────────────┐    │
│  │  Shared Layer (shared/*.ts)              │    │
│  │  rpc-client (viem) / etherscan / cache   │    │
│  │  coingecko / 4byte                       │    │
│  └─────────────┬────────────────────────────┘    │
│                │                                  │
│  ┌─────────────▼────────────────────────────┐    │
│  │  Data Layer (data/*.json)                │    │
│  │  protocols / tokens / labels / signatures│    │
│  │  → 오프라인 폴백 + 커뮤니티 PR 기여       │    │
│  └──────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

### 6.2 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 언어 | TypeScript | npm 생태계, MCP SDK 호환, 타입 안전 |
| 블록체인 | viem | 경량, 타입 안전, ethers.js보다 번들 작음 |
| ABI 해석 | 4byte.directory + Etherscan | 무료, 커버리지 높음 |
| 가격 데이터 | CoinGecko (무료 티어) | 안정적, 무료로 충분 |
| 프로토콜 DB | 내장 JSON | 200+ 주소. 커뮤니티 PR로 확장 |
| MCP | @modelcontextprotocol/sdk | 공식 SDK |
| 빌드 | tsup | ESM + CJS 동시 출력 |
| 테스트 | vitest | TypeScript 네이티브 |

### 6.3 프로젝트 구조

```
evmscope/
├── src/
│   ├── index.ts              # MCP 서버 진입점
│   ├── tools/                # 각 도구 (1파일 = 1도구)
│   │   ├── getTokenPrice.ts
│   │   ├── getGasPrice.ts
│   │   ├── getBalance.ts
│   │   ├── getTokenInfo.ts
│   │   ├── resolveENS.ts
│   │   └── ... (최대 20개)
│   ├── shared/               # 공유 인프라
│   │   ├── rpc-client.ts     # viem 클라이언트
│   │   ├── etherscan.ts      # Etherscan API
│   │   ├── coingecko.ts      # CoinGecko API
│   │   └── cache.ts          # 응답 캐싱
│   └── data/                 # 내장 DB (커뮤니티 기여 가능)
│       ├── protocols.json    # 프로토콜 주소 DB
│       ├── tokens.json       # 토큰 정보 DB
│       ├── labels.json       # 주소 라벨 DB
│       └── signatures.json   # 함수 시그니처 DB
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE                   # MIT
```

**설계 원칙:**
- 모노레포 아님. 단일 패키지
- **도구 추가 = 파일 1개 추가** → 오픈소스 기여 진입장벽 최저
- 내장 DB는 JSON 파일 → 비개발자도 PR로 프로토콜/토큰 추가 가능

---

## 7. 스타 확보 전략

### 7.1 왜 스타를 받을 수 있는가

| 요인 | 분석 |
|------|------|
| 번들 매력 | "20개 도구가 하나의 MCP에" → 설치 이유가 명확 |
| AgentKit 보완재 | 경쟁이 아닌 공생 → AgentKit 사용자가 자연스럽게 채택 |
| 즉각적 가치 | `getTokenPrice("ETH")` → 설치 후 10초 내 가치 체험 |
| 넓은 검색 유입 | 20가지 키워드("evm price mcp", "gas price mcp" 등)로 유입 |
| 기여 용이 | 도구 1개 추가 = 파일 1개 PR → Hacktoberfest 등에서 기여자 유치 |
| 시장 타이밍 | DeFAI $10B+, MCP 생태계 급성장 중 |

### 7.2 마케팅 채널

| 채널 | 전략 |
|------|------|
| awesome-mcp-servers | "20 EVM tools in one MCP server" |
| Reddit r/ethdev | "Built a free MCP server with 20 tools for crypto AI agents" |
| Reddit r/ClaudeAI | Claude 에이전트 + 크립토 데모 |
| X (Twitter) | 트레이딩 에이전트 데모 GIF |
| Hacker News | "Show HN: evmscope — crypto intelligence toolkit for AI agents" |
| AgentKit 커뮤니티 | 보완재로 소개 |
| Product Hunt | 런칭 |

### 7.3 현실적 스타 예측

| 시나리오 | 확률 | 스타 범위 |
|---------|------|----------|
| awesome-list 등록만 | 30% | 30~100⭐ |
| 좋은 README + Reddit/HN | 35% | 100~300⭐ |
| 바이럴 + 의존성 채택 | 25% | 300~800⭐ |
| 대박 (AgentKit 공식 추천 등) | 10% | 800⭐+ |

---

## 8. 리스크 및 대응

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 유사 통합 MCP 등장 | 낮음 | 높음 | 빠른 MVP 출시로 선점. 도구 수 + 품질로 차별화 |
| 무료 API Rate Limit | 중간 | 중간 | MCP는 사용자 로컬 실행 → 중앙 집중 없음. 캐싱 적용 |
| 상용 플랫폼의 MCP 진출 | 중간 | 높음 | Alchemy/Moralis가 MCP 출시해도 유료. 무료 포지션 유지 |
| 프로토콜/체인 추가 요청 폭탄 | 높음 | 중간 | 커뮤니티 PR 방식 (JSON 파일 수정). 코어 로직은 안정 유지 |
| 스코프 확장으로 완성 지연 | 중간 | 중간 | Phase별 출시. MVP는 5개 도구만. Phase 3~4는 수요 보고 결정 |
| decodeTx 복잡도 과소평가 | 높음 | 중간 | Phase 2에 여유 기간 배정 (+2주). 기본 디코딩부터 점진 확장 |

---

## 부록

### A. 프로젝트 히스토리: tx-decoder → evmscope 피벗

이 프로젝트는 원래 **tx-decoder** (트랜잭션 자연어 해석기)로 기획되었습니다.

**원래 컨셉:**
- 트랜잭션 해시 → 자연어 설명 ("2.5 ETH를 4,823 USDC로 스왑했습니다")
- ethereum-input-data-decoder (602⭐, 2022년 아카이브)의 후속 프로젝트

**Agent Council (Gemini) 냉정한 비판:**

| 비판 | 동의도 | 대응 |
|------|--------|------|
| 4중 배포가 과하다 | 100% | MCP 하나로 시작 |
| 무료 API Rate Limit | 90% | 로컬 실행으로 해결 |
| AI 환각 리스크 | 80% | LLM 완전 제거. JSON만 출력 |
| Nice-to-have이다 | 수정됨 | 단독 기능 → 20개 도구 번들로 피벗 |
| MCP 사용자 극소수 | 반론 | MCP 생태계 급성장 중 |

**Claude 자체 비판:**

| 비판 | 대응 |
|------|------|
| "602⭐ 후계자" 논리 약함 | 완전히 새로운 카테고리로 피벗 |
| 자연어 설명은 핵심 가치 아님 | 구조화된 JSON이 핵심. 자연어는 보너스 |
| 현실적 기대값 100~200⭐ | 번들 전략으로 100~300⭐ 상향 |

**피벗 결과:**
- 단일 기능 → **20개 도구 번들**
- 사람용 자연어 → **에이전트용 구조화 JSON**
- "Nice-to-have" → **트레이딩 에이전트 인텔리전스 인프라**
- tx-decoder → **evmscope**

### B. 경쟁사 전수 조사 기록

| 채널 | 검색 키워드 | 결과 |
|------|-----------|------|
| GitHub | "transaction decoder" + "natural language" | 기술적 디코더만. AI 버전 1개 (tx-explain, 2⭐) |
| GitHub | "tx interpreter" / "tx explainer" | 해당 없음 |
| npm | "transaction decoder" + AI | 기술적 디코더만. AI 패키지 0개 |
| 웹 검색 | Eden Network tx-explain | 직접 경쟁자 (2⭐, 유료 API 3중 의존, 실패) |
| 웹 검색 | Once Upon a Block, ChainGPT | 클로즈드 소스 서비스만 |
| 학술 논문 | LLM + blockchain transaction | 연구 단계. 배포 가능 도구 없음 |

**경쟁 구도 매트릭스:**

```
                  오픈소스?
                 YES          NO
            ┌──────────┬──────────┐
 AI/MCP?    │          │          │
   YES      │ tx-explain│ ChainGPT │
            │ (2⭐ 실패)│ Alchemy  │
            ├──────────┤ Moralis  │
   NO       │ 602⭐폐기 │ Tenderly │
            │ ethtx 267│ Etherscan│
            └──────────┴──────────┘
                  ↑
            evmscope 포지션:
            오픈소스 + 무료 + MCP 네이티브 + 20개 도구 번들
```

### C. 프로젝트명 선정 과정

| 후보 | npm | GitHub | 결과 |
|------|-----|--------|------|
| chainpulse | ❌ 점유 | — | 제외 |
| web3-mcp | ❌ 점유 | — | 제외 |
| defi-mcp | ❌ 점유 | — | 제외 |
| onchain-mcp | ✅ | ❌ Bankless (73⭐) | 제외 |
| chainscope | ✅ | ⚠️ 31⭐ 존재 | 제외 |
| **evmscope** | **✅** | **✅ 완전 비어있음** | **✅ 확정** |

**확정: evmscope** — EVM 특화 + 관찰/분석(scope). npm + GitHub 완전 미점유.

### D. 조사 출처

- [ethereum-input-data-decoder](https://github.com/miguelmota/ethereum-input-data-decoder) — 602⭐, 2022년 아카이브
- [ethtx_ce](https://github.com/EthTx/ethtx_ce) — 267⭐
- [eden-network/tx-explain](https://github.com/eden-network/tx-explain) — 2⭐, 실패
- [GOAT SDK](https://github.com/goat-sdk/goat) — 964⭐
- [Solana Agent Kit](https://github.com/sendaifun/solana-agent-kit) — 1,623⭐
- [Coinbase AgentKit](https://github.com/coinbase/agentkit) — 1,137⭐
- [Slither](https://github.com/crytic/slither) — 6,160⭐
- [mcp-crypto-price](https://github.com/truss44/mcp-crypto-price) — 38⭐
- [awesome-mcp-servers (TensorBlock)](https://github.com/TensorBlock/awesome-mcp-servers)
- [awesome-blockchain-mcps](https://github.com/royyannick/awesome-blockchain-mcps) — 34⭐
- [LLM for Crypto Transaction Analysis (arXiv)](https://arxiv.org/html/2501.18158v1)

---

*이 문서는 Agent Council (Claude + Gemini) 의견 수집 2회, 웹/GitHub/npm 조사, 냉정한 자체 분석을 통해 작성되었습니다.*
