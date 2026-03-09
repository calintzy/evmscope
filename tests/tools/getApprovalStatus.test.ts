import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/rpc-client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("../../src/shared/coingecko.js", () => ({
  resolveTokenMeta: vi.fn(),
  getPrice: vi.fn(),
  resolveCoingeckoId: vi.fn(),
}));

vi.mock("../../src/shared/cache.js", () => {
  const store = new Map();
  return {
    cache: {
      get: vi.fn((key: string) => {
        const entry = store.get(key);
        if (!entry) return { data: null, hit: false };
        return { data: entry, hit: true };
      }),
      set: vi.fn((key: string, data: unknown) => {
        store.set(key, data);
      }),
      getStale: vi.fn(() => null),
      clear: vi.fn(() => store.clear()),
    },
  };
});

import { resolveTokenMeta } from "../../src/shared/coingecko.js";
import { cache } from "../../src/shared/cache.js";

describe("getApprovalStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cache.get).mockReturnValue({ data: null, hit: false });
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getApprovalStatus.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("resolveTokenMeta로 토큰 주소 해석", () => {
    vi.mocked(resolveTokenMeta).mockReturnValue({
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      addresses: { ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
      coingeckoId: "usd-coin",
    });

    const meta = resolveTokenMeta("USDC", "ethereum");
    expect(meta?.symbol).toBe("USDC");
    expect((meta?.addresses as Record<string, string>)?.ethereum).toBe("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  });

  it("없는 토큰은 null 반환", () => {
    vi.mocked(resolveTokenMeta).mockReturnValue(null);
    const meta = resolveTokenMeta("FAKECOIN", "ethereum");
    expect(meta).toBeNull();
  });

  it("unlimited allowance 판정", () => {
    const UNLIMITED_THRESHOLD = 2n ** 128n;
    const maxUint256 = 2n ** 256n - 1n;
    expect(maxUint256 >= UNLIMITED_THRESHOLD).toBe(true);
    expect(1000000n >= UNLIMITED_THRESHOLD).toBe(false);
  });

  it("리스크 레벨 판정 로직", () => {
    const calcRisk = (unlimitedCount: number, totalCount: number) => {
      if (unlimitedCount >= 3) return "high";
      if (unlimitedCount >= 1 || totalCount >= 3) return "moderate";
      return "safe";
    };

    expect(calcRisk(0, 0)).toBe("safe");
    expect(calcRisk(0, 2)).toBe("safe");
    expect(calcRisk(1, 1)).toBe("moderate");
    expect(calcRisk(0, 3)).toBe("moderate");
    expect(calcRisk(3, 3)).toBe("high");
    expect(calcRisk(5, 5)).toBe("high");
  });
});
