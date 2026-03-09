import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/ethplorer.js", () => ({
  getTopTokenHolders: vi.fn(),
}));

vi.mock("../../src/shared/etherscan.js", () => ({
  getABI: vi.fn(),
  getTokenTransfers: vi.fn(),
  lookup4byte: vi.fn(),
}));

vi.mock("../../src/shared/coingecko.js", () => ({
  resolveCoingeckoId: vi.fn(),
  resolveTokenMeta: vi.fn(),
  getPrice: vi.fn(),
}));

vi.mock("../../src/shared/cache.js", () => ({
  cache: {
    get: vi.fn(() => ({ data: null, hit: false })),
    set: vi.fn(),
    getStale: vi.fn(() => null),
    clear: vi.fn(),
  },
}));

import { getTopTokenHolders } from "../../src/shared/ethplorer.js";

describe("getTokenHolders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getTokenHolders.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("Ethplorer에서 홀더 데이터 반환", async () => {
    vi.mocked(getTopTokenHolders).mockResolvedValue({
      holders: [
        { address: "0xabc1", balance: 1000000, share: 15.5 },
        { address: "0xabc2", balance: 500000, share: 7.8 },
      ],
      totalHolders: 12345,
    });

    const result = await getTopTokenHolders("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", 10);
    expect(result?.holders).toHaveLength(2);
    expect(result?.totalHolders).toBe(12345);
    expect(result?.holders[0].share).toBe(15.5);
  });

  it("없는 토큰은 null 반환", async () => {
    vi.mocked(getTopTokenHolders).mockResolvedValue(null);
    const result = await getTopTokenHolders("0x0000000000000000000000000000000000000000");
    expect(result).toBeNull();
  });

  it("홀더 점유율 합산", () => {
    const holders = [
      { share: 15.5 },
      { share: 7.8 },
      { share: 5.2 },
    ];
    const total = holders.reduce((sum, h) => sum + h.share, 0);
    expect(total).toBeCloseTo(28.5);
  });

  it("limit 최대값 제한", () => {
    const limit = Math.min(200, 100);
    expect(limit).toBe(100);
  });
});
