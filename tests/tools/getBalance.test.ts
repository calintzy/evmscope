import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/rpc-client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("../../src/shared/coingecko.js", () => ({
  getPrice: vi.fn(),
  resolveCoingeckoId: vi.fn(),
}));

vi.mock("../../src/shared/cache.js", () => ({
  cache: {
    get: vi.fn(() => ({ data: null, hit: false })),
    set: vi.fn(),
    getStale: vi.fn(() => null),
    clear: vi.fn(),
  },
}));

describe("getBalance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getBalance.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("유효하지 않은 주소 형식 검증", async () => {
    // isAddress를 직접 테스트
    const { isAddress } = await import("viem");
    expect(isAddress("0xinvalid")).toBe(false);
    expect(isAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toBe(true);
    expect(isAddress("not-an-address")).toBe(false);
  });
});
