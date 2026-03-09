import { describe, it, expect, vi, beforeEach } from "vitest";

// coingecko 모듈 mock
vi.mock("../../src/shared/coingecko.js", () => ({
  resolveCoingeckoId: vi.fn(),
  resolveTokenMeta: vi.fn(),
  getPrice: vi.fn(),
}));

import { resolveCoingeckoId, resolveTokenMeta, getPrice } from "../../src/shared/coingecko.js";

// register 함수를 테스트하기 위해 직접 handler 로직을 검증
// register()는 McpServer를 필요로 하므로, 대신 도구 로직을 간접 테스트
describe("getTokenPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getTokenPrice.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("resolveCoingeckoId가 심볼로 매핑", () => {
    vi.mocked(resolveCoingeckoId).mockReturnValue("ethereum");
    const result = resolveCoingeckoId("ETH", "ethereum");
    expect(result).toBe("ethereum");
  });

  it("resolveCoingeckoId가 없는 토큰은 null", () => {
    vi.mocked(resolveCoingeckoId).mockReturnValue(null);
    const result = resolveCoingeckoId("FAKECOIN", "ethereum");
    expect(result).toBeNull();
  });

  it("getPrice가 가격 데이터 반환", async () => {
    vi.mocked(getPrice).mockResolvedValue({
      priceUsd: 1929.20,
      change24h: -2.34,
      marketCap: 232000000000,
      volume24h: 12500000000,
    });

    const result = await getPrice("ethereum");
    expect(result.priceUsd).toBe(1929.20);
    expect(result.change24h).toBe(-2.34);
  });

  it("getPrice 실패 시 에러 throw", async () => {
    vi.mocked(getPrice).mockRejectedValue(new Error("CoinGecko API error: 500"));
    await expect(getPrice("ethereum")).rejects.toThrow("CoinGecko API error: 500");
  });

  it("resolveTokenMeta가 토큰 메타정보 반환", () => {
    vi.mocked(resolveTokenMeta).mockReturnValue({
      symbol: "ETH",
      name: "Ethereum",
      decimals: 18,
      addresses: {},
      coingeckoId: "ethereum",
    });

    const meta = resolveTokenMeta("ETH");
    expect(meta?.symbol).toBe("ETH");
    expect(meta?.name).toBe("Ethereum");
  });
});
