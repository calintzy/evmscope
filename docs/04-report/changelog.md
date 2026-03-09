# evmscope Changelog

모든 notable한 변경 사항은 이 파일에 문서화됩니다.

---

## [0.1.0] - 2026-03-09

### Added

- **MVP 5개 도구 완성**
  - `getTokenPrice`: CoinGecko API로 토큰 가격/24h 변동률 조회
  - `getGasPrice`: viem으로 slow/normal/fast 3단계 가스비 조회
  - `getBalance`: ETH + ERC-20 토큰 잔고 조회
  - `getTokenInfo`: ERC-20 컨트랙트 메타데이터 조회
  - `resolveENS`: ENS 이름 ↔ 주소 양방향 해석

- **5개 EVM 체인 지원**
  - Ethereum (Chain ID 1)
  - Polygon (Chain ID 137)
  - Arbitrum (Chain ID 42161)
  - Base (Chain ID 8453)
  - Optimism (Chain ID 10)

- **공유 모듈**
  - `cache.ts`: TTL 기반 in-memory 캐싱 (rate limit 보호)
  - `rpc-client.ts`: viem PublicClient 멀티체인 관리
  - `coingecko.ts`: CoinGecko API 래퍼

- **Built-in Data**
  - `chains.json`: 5개 체인 RPC 엔드포인트 설정
  - `tokens.json`: 19개 주요 토큰 메타데이터

- **에러 처리 및 폴백**
  - 7개 ErrorCode (INVALID_INPUT, TOKEN_NOT_FOUND, API_ERROR, RPC_ERROR, RATE_LIMITED, ENS_NOT_FOUND, CHAIN_NOT_SUPPORTED)
  - API 실패 시 자동 폴백 전략

- **테스트 스위트**
  - 7개 테스트 파일, 28개 테스트 케이스
  - vitest 기반 유닛 테스트
  - Mock 기반 isolation 테스트

- **빌드 및 배포**
  - tsup을 통한 ESM/CJS 동시 지원
  - TypeScript strict 모드 준수
  - npm 패키지 배포 설정 (`npx evmscope`)

- **문서**
  - README.md: 설치/사용법/JSON 예시 (영문, 202줄)
  - Plan 문서: 기획 및 범위 정의
  - Design 문서: 기술 아키텍처 설계
  - Analysis 문서: Gap 분석 (97% Match Rate)

### Changed

- **Polygon Native Currency**
  - MATIC → POL (리브랜딩 반영)

- **Cache 구현**
  - 설계의 단순 `T | null` → 실제로는 `{ data: T | null; hit: boolean }` (명확성 향상)
  - Rate limit 대응용 `getStale()` 메서드 추가

### Not Changed

- 모든 도구의 Input/Output 스키마: Design 완벽 일치
- 도구 파일 패턴: 1파일 = 1도구 원칙 준수
- Error Code 정의: 7개 전부 구현
- Cache TTL 값: 모두 Design 명시 준수

### Known Issues

- **tokens.json 데이터 수량**: 목표 50개 vs 실제 19개 (MVP 우선순위)
- **자동 도구 등록**: Design에서 언급한 "tools/ 자동 등록"은 번들러 호환성으로 명시적 import로 변경
- **Integration Test**: MCP 프로토콜 E2E 테스트 미포함 (수동 테스트만 완료)
- **CI/CD 파이프라인**: `.github/workflows/ci.yml` 미구현

### Next Steps (v0.5)

- tokens.json 확장 (50개+ 토큰)
- `decodeTx` 도구 추가 (트랜잭션 해석)
- `getTxStatus` 도구 추가 (트랜잭션 상태)
- `getContractABI` 도구 추가 (ABI 자동 조회)
- `identifyAddress` 도구 추가 (주소 라벨 식별)
- CI/CD 파이프라인 구성
- awesome-mcp-servers PR 제출

---

## Version History Summary

| Version | Status | Completion | Release Date |
|---------|--------|------------|--------------|
| 0.1.0 | ✅ Complete | 100% (MVP) | 2026-03-09 |
| 0.5.0 | 🔄 Planned | - | TBD |
| 1.0.0 | 🔄 Planned | - | TBD |
| 1.5.0 | 🔄 Planned | - | TBD |

---

## PDCA Cycle Metrics

### Plan Phase
- **Document**: `docs/01-plan/features/evmscope.plan.md`
- **Scope**: 5 tools, 5 chains, MVP focus
- **Duration Estimate**: 5 days

### Design Phase
- **Document**: `docs/02-design/features/evmscope.design.md`
- **Architecture**: 3-layer (Tools, Shared, Data)
- **Tool Specification**: 5 tools with I/O schema, error handling, cache TTL

### Do Phase (Implementation)
- **Source Files**: 10개
- **Test Files**: 7개
- **Actual Duration**: Completed on 2026-03-09
- **Lines of Code**: ~1,200
- **Test Cases**: 28 (all passing)

### Check Phase (Verification)
- **Document**: `docs/03-analysis/evmscope.analysis.md`
- **Match Rate**: 97%
- **Compliance**: 100% (conventions, architecture, error handling)
- **Test Coverage**: 100% (all 7 test files, 28 test cases)

### Act Phase (Completion Report)
- **Document**: `docs/04-report/features/evmscope.report.md`
- **Status**: ✅ Completed
- **Quality**: MVP 완성, Design 일치도 97%
- **Next Action**: npm 퍼블릭 배포, awesome-mcp-servers 등록

---

## How to Install

```bash
# Latest version (0.1.0)
npm install evmscope

# Or run directly
npx evmscope
```

## How to Contribute

See upcoming CONTRIBUTING.md in v0.5 for development guidelines.

## License

MIT - See LICENSE file

---

**evmscope v0.1.0**: AI 에이전트를 위한 EVM 블록체인 인텔리전스 MCP 툴킷
**Tagline**: "AgentKit으로 실행하고, evmscope로 판단하세요."
