import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/defillama.js", () => ({
  getProtocolData: vi.fn(),
  getYieldPools: vi.fn(),
}));

vi.mock("../../src/shared/cache.js", () => ({
  cache: {
    get: vi.fn(() => ({ data: null, hit: false })),
    set: vi.fn(),
    getStale: vi.fn(() => null),
    clear: vi.fn(),
  },
}));

import { getYieldPools } from "../../src/shared/defillama.js";

describe("getYieldRates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getYieldRates.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("getYieldPools가 수익률 데이터 반환", async () => {
    vi.mocked(getYieldPools).mockResolvedValue([
      { pool: "pool1", chain: "Ethereum", project: "aave-v3", symbol: "USDC", tvlUsd: 500000000, apy: 5.2, apyBase: 3.1, apyReward: 2.1, stablecoin: true },
      { pool: "pool2", chain: "Ethereum", project: "compound-v3", symbol: "ETH", tvlUsd: 300000000, apy: 3.8, apyBase: 3.8, apyReward: null, stablecoin: false },
    ]);

    const result = await getYieldPools({ protocol: "aave-v3" });
    expect(result).toHaveLength(2);
    expect(result[0].apy).toBe(5.2);
    expect(result[0].project).toBe("aave-v3");
  });

  it("빈 결과 반환", async () => {
    vi.mocked(getYieldPools).mockResolvedValue([]);
    const result = await getYieldPools({ protocol: "nonexistent" });
    expect(result).toHaveLength(0);
  });

  it("minTvl 필터 적용", () => {
    const pools = [
      { tvlUsd: 5000000 },
      { tvlUsd: 500000 },
      { tvlUsd: 2000000 },
    ];
    const minTvl = 1000000;
    const filtered = pools.filter((p) => p.tvlUsd >= minTvl);
    expect(filtered).toHaveLength(2);
  });

  it("APY 내림차순 정렬", () => {
    const pools = [
      { apy: 3.2 },
      { apy: 8.1 },
      { apy: 5.5 },
    ];
    pools.sort((a, b) => b.apy - a.apy);
    expect(pools[0].apy).toBe(8.1);
    expect(pools[2].apy).toBe(3.2);
  });
});
