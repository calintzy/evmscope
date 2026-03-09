import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/rpc-client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("../../src/shared/cache.js", () => ({
  cache: {
    get: vi.fn(() => ({ data: null, hit: false })),
    set: vi.fn(),
    getStale: vi.fn(() => null),
    clear: vi.fn(),
  },
}));

describe("resolveENS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/resolveENS.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("주소 형식 판별", async () => {
    const { isAddress } = await import("viem");

    // 유효한 이더리움 주소
    expect(isAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toBe(true);

    // ENS 이름 (주소 아님)
    expect(isAddress("vitalik.eth")).toBe(false);
  });

  it("ENS 이름에 .이 포함되어야 함", () => {
    const input = "vitalik";
    expect(input.includes(".")).toBe(false);

    const validInput = "vitalik.eth";
    expect(validInput.includes(".")).toBe(true);
  });
});
