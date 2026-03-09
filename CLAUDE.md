# evmscope Project Rules

## README 동기화 규칙

README 파일을 수정할 때 **모든 언어 버전을 함께 수정**해야 합니다:
- `README.md` (영문)
- `README-ko.md` (한국어)

새로운 언어 버전이 추가되면 이 목록을 업데이트하세요.

## 프로젝트 구조

- `src/tools/*.ts` — 1파일 = 1도구 패턴
- `src/shared/*.ts` — 공유 모듈 (rpc-client, cache, coingecko, etherscan)
- `src/data/*.json` — 내장 DB (tokens, chains, labels, protocols, signatures)
- `tests/` — vitest 테스트

## 코드 규칙

- 모든 응답은 `ToolResult<T>` 타입 (makeSuccess / makeError)
- 코드 주석은 한국어
- Read-only 원칙: 블록체인 write 기능 절대 없음
