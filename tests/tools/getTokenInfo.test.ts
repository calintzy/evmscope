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

describe("getTokenInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getTokenInfo.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("내장 DB에서 토큰 심볼로 조회 가능", async () => {
    const tokensData = (await import("../../src/data/tokens.json")).default;
    const usdc = tokensData.find((t) => t.symbol === "USDC");
    expect(usdc).toBeDefined();
    expect(usdc!.decimals).toBe(6);
    expect(usdc!.coingeckoId).toBe("usd-coin");
    expect(usdc!.addresses).toHaveProperty("ethereum");
  });

  it("내장 DB에 존재하지 않는 토큰", async () => {
    const tokensData = (await import("../../src/data/tokens.json")).default;
    const fake = tokensData.find((t) => t.symbol === "FAKECOIN");
    expect(fake).toBeUndefined();
  });
});
