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

// SSRF 방지용 내부 네트워크 차단 패턴
const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/, // AWS 메타데이터
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,
  /^metadata\.google\.internal$/i,
];

/** 외부 HTTP(S) URL만 허용 — SSRF 방지 */
export function isAllowedURL(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const hostname = url.hostname;
    return !BLOCKED_HOSTS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

/** DefiLlama slug 검증 (영숫자, 하이픈만 허용) */
export function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(slug) && slug.length <= 100;
}

/** RPC URL 형식 검증 (http/https/ws/wss만 허용) */
export function isValidRpcUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return ["http:", "https:", "ws:", "wss:"].includes(url.protocol);
  } catch {
    return false;
  }
}
