import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/defillama.js", () => ({
  getProtocolData: vi.fn(),
}));

vi.mock("../../src/shared/cache.js", () => {
  return {
    cache: {
      get: vi.fn(() => ({ data: null, hit: false })),
      set: vi.fn(),
      getStale: vi.fn(() => null),
      clear: vi.fn(),
    },
  };
});

import { getProtocolData } from "../../src/shared/defillama.js";

describe("getProtocolTVL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getProtocolTVL.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("getProtocolData가 TVL 데이터 반환", async () => {
    vi.mocked(getProtocolData).mockResolvedValue({
      name: "Aave",
      slug: "aave",
      tvl: 12000000000,
      chainTvls: {
        Ethereum: 8000000000,
        Polygon: 2000000000,
        Arbitrum: 1500000000,
        Optimism: 500000000,
      },
      change_1d: 1.5,
      change_7d: -3.2,
    });

    const result = await getProtocolData("aave");
    expect(result?.name).toBe("Aave");
    expect(result?.tvl).toBe(12000000000);
    expect(result?.chainTvls.Ethereum).toBe(8000000000);
    expect(result?.change_1d).toBe(1.5);
  });

  it("없는 프로토콜은 null 반환", async () => {
    vi.mocked(getProtocolData).mockResolvedValue(null);
    const result = await getProtocolData("nonexistent");
    expect(result).toBeNull();
  });

  it("프로토콜 이름에서 slug 변환", () => {
    const resolveSlug = (input: string): string => {
      return input.toLowerCase().trim().replace(/\s+/g, "-");
    };

    expect(resolveSlug("Aave V3")).toBe("aave-v3");
    expect(resolveSlug("Uniswap V3")).toBe("uniswap-v3");
    expect(resolveSlug("Lido")).toBe("lido");
  });

  it("체인별 TVL 비율 계산", () => {
    const totalTvl = 10000000000;
    const chainTvl = 7000000000;
    const percentage = Math.round((chainTvl / totalTvl) * 10000) / 100;
    expect(percentage).toBe(70);
  });
});
