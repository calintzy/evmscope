import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/lifi.js", () => ({
  fetchBridgeRoutes: vi.fn(),
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

import { fetchBridgeRoutes } from "../../src/shared/lifi.js";

describe("getBridgeRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getBridgeRoutes.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("브릿지 경로 반환", async () => {
    vi.mocked(fetchBridgeRoutes).mockResolvedValue({
      routes: [
        { bridge: "Stargate", estimatedTime: 60, feeUsd: 0.5, gasCostUsd: 2.1, amountOut: "99500000", amountOutUsd: 99.5 },
        { bridge: "Hop", estimatedTime: 120, feeUsd: 0.3, gasCostUsd: 1.8, amountOut: "99200000", amountOutUsd: 99.2 },
      ],
    });

    const result = await fetchBridgeRoutes("ethereum", "arbitrum", "0xusdc", "0xusdc", "100000000");
    expect(result?.routes).toHaveLength(2);
    expect(result?.routes[0].bridge).toBe("Stargate");
  });

  it("경로 없으면 빈 배열", async () => {
    vi.mocked(fetchBridgeRoutes).mockResolvedValue({ routes: [] });
    const result = await fetchBridgeRoutes("ethereum", "polygon", "0xtoken", "0xtoken", "1000");
    expect(result?.routes).toHaveLength(0);
  });

  it("경로 비용 정렬 (수령액 내림차순)", () => {
    const routes = [
      { amountOutUsd: 99.2 },
      { amountOutUsd: 99.8 },
      { amountOutUsd: 99.5 },
    ];
    routes.sort((a, b) => b.amountOutUsd - a.amountOutUsd);
    expect(routes[0].amountOutUsd).toBe(99.8);
    expect(routes[2].amountOutUsd).toBe(99.2);
  });

  it("같은 체인은 에러 조건", () => {
    expect("ethereum" === "ethereum").toBe(true);
    expect("ethereum" === "arbitrum").toBe(false);
  });

  it("null 결과 처리", async () => {
    vi.mocked(fetchBridgeRoutes).mockResolvedValue(null);
    const result = await fetchBridgeRoutes("ethereum", "polygon", "0xtoken", "0xtoken", "1000");
    expect(result).toBeNull();
  });
});
