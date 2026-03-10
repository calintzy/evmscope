import { describe, it, expect } from "vitest";
import {
  isAllowedURL,
  isValidSlug,
  isValidRpcUrl,
} from "../../src/shared/validate.js";

describe("isAllowedURL", () => {
  // 허용되는 URL
  it("https:// URL 허용", () => {
    expect(isAllowedURL("https://api.example.com/data")).toBe(true);
  });

  it("http:// URL 허용", () => {
    expect(isAllowedURL("http://api.example.com/data")).toBe(true);
  });

  // 내부 네트워크 차단 (SSRF 방지)
  it("localhost 차단", () => {
    expect(isAllowedURL("http://localhost:8080")).toBe(false);
  });

  it("localhost 대소문자 무시하고 차단", () => {
    expect(isAllowedURL("http://LOCALHOST:3000")).toBe(false);
  });

  it("127.0.0.1 차단", () => {
    expect(isAllowedURL("http://127.0.0.1")).toBe(false);
  });

  it("127.x.x.x 대역 차단", () => {
    expect(isAllowedURL("http://127.1.2.3")).toBe(false);
  });

  it("10.x.x.x 사설 IP 차단", () => {
    expect(isAllowedURL("http://10.0.0.1")).toBe(false);
    expect(isAllowedURL("http://10.255.255.255")).toBe(false);
  });

  it("172.16-31.x.x 사설 IP 차단", () => {
    expect(isAllowedURL("http://172.16.0.1")).toBe(false);
    expect(isAllowedURL("http://172.31.255.255")).toBe(false);
  });

  it("172.15.x.x는 허용 (사설 대역 아님)", () => {
    expect(isAllowedURL("http://172.15.0.1")).toBe(true);
  });

  it("172.32.x.x는 허용 (사설 대역 아님)", () => {
    expect(isAllowedURL("http://172.32.0.1")).toBe(true);
  });

  it("192.168.x.x 사설 IP 차단", () => {
    expect(isAllowedURL("http://192.168.0.1")).toBe(false);
    expect(isAllowedURL("http://192.168.1.100")).toBe(false);
  });

  it("169.254.x.x 링크로컬 주소 차단 (AWS 메타데이터)", () => {
    expect(isAllowedURL("http://169.254.169.254")).toBe(false);
  });

  it("0.0.0.0 차단", () => {
    expect(isAllowedURL("http://0.0.0.0")).toBe(false);
  });

  it("metadata.google.internal 차단", () => {
    expect(isAllowedURL("http://metadata.google.internal")).toBe(false);
  });

  it("metadata.google.internal 대소문자 무시하고 차단", () => {
    expect(isAllowedURL("http://Metadata.Google.Internal")).toBe(false);
  });

  // 비-HTTP 프로토콜 차단
  it("ftp:// 프로토콜 차단", () => {
    expect(isAllowedURL("ftp://example.com/file")).toBe(false);
  });

  it("file:// 프로토콜 차단", () => {
    expect(isAllowedURL("file:///etc/passwd")).toBe(false);
  });

  // 잘못된 URL 형식 차단
  it("잘못된 URL 형식 차단", () => {
    expect(isAllowedURL("not-a-url")).toBe(false);
  });

  it("빈 문자열 차단", () => {
    expect(isAllowedURL("")).toBe(false);
  });
});

describe("isValidSlug", () => {
  // 유효한 slug
  it("소문자 영문 slug 허용", () => {
    expect(isValidSlug("aave")).toBe(true);
  });

  it("하이픈 포함 slug 허용", () => {
    expect(isValidSlug("uniswap-v3")).toBe(true);
  });

  it("숫자 포함 slug 허용", () => {
    expect(isValidSlug("layer2")).toBe(true);
  });

  it("대문자 포함 slug 허용", () => {
    expect(isValidSlug("Aave")).toBe(true);
  });

  // 유효하지 않은 slug
  it("특수문자 포함 slug 차단", () => {
    expect(isValidSlug("aave@v2")).toBe(false);
  });

  it("공백 포함 slug 차단", () => {
    expect(isValidSlug("aave v3")).toBe(false);
  });

  it("슬래시 포함 slug 차단", () => {
    expect(isValidSlug("aave/v3")).toBe(false);
  });

  it("100자 초과 slug 차단", () => {
    const longSlug = "a".repeat(101);
    expect(isValidSlug(longSlug)).toBe(false);
  });

  it("100자 이하 slug 허용", () => {
    const slug100 = "a".repeat(100);
    expect(isValidSlug(slug100)).toBe(true);
  });

  it("빈 문자열 차단", () => {
    expect(isValidSlug("")).toBe(false);
  });

  it("하이픈으로 시작하는 slug 차단", () => {
    expect(isValidSlug("-aave")).toBe(false);
  });
});

describe("isValidRpcUrl", () => {
  // 허용되는 프로토콜
  it("http:// URL 허용", () => {
    expect(isValidRpcUrl("http://rpc.example.com")).toBe(true);
  });

  it("https:// URL 허용", () => {
    expect(isValidRpcUrl("https://rpc.example.com")).toBe(true);
  });

  it("ws:// URL 허용", () => {
    expect(isValidRpcUrl("ws://rpc.example.com")).toBe(true);
  });

  it("wss:// URL 허용", () => {
    expect(isValidRpcUrl("wss://rpc.example.com")).toBe(true);
  });

  // 차단되는 프로토콜
  it("ftp:// 프로토콜 차단", () => {
    expect(isValidRpcUrl("ftp://rpc.example.com")).toBe(false);
  });

  it("file:// 프로토콜 차단", () => {
    expect(isValidRpcUrl("file:///etc/passwd")).toBe(false);
  });

  // 잘못된 URL 형식
  it("잘못된 URL 형식 차단", () => {
    expect(isValidRpcUrl("not-a-url")).toBe(false);
  });

  it("빈 문자열 차단", () => {
    expect(isValidRpcUrl("")).toBe(false);
  });
});
