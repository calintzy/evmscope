import { isAddress } from "viem";

/** viem isAddress 래퍼 — 주소 검증 통일 */
export function isValidAddress(addr: string): boolean {
  return isAddress(addr);
}

/** 에러 메시지에서 URL(RPC 등) 제거 (보안) */
export function sanitizeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  // http(s)://... 패턴 제거
  return msg.replace(/https?:\/\/[^\s)'"]+/g, "[URL_REDACTED]");
}

/** 블록 범위 상한 (DoS 방지) */
export const MAX_BLOCK_RANGE = 10000;
