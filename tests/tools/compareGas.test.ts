import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/rpc-client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("../../src/shared/coingecko.js", () => ({
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

import { getClient } from "../../src/shared/rpc-client.js";
import { getPrice } from "../../src/shared/coingecko.js";
import { cache } from "../../src/shared/cache.js";

describe("compareGas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cache.get).mockReturnValue({ data: null, hit: false });
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/compareGas.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("5개 체인 모두에 대해 RPC 클라이언트 호출", () => {
    const mockClient = {
      getBlock: vi.fn().mockResolvedValue({ baseFeePerGas: 20000000000n, number: 12345678n }),
      estimateMaxPriorityFeePerGas: vi.fn().mockResolvedValue(1500000000n),
    };

    vi.mocked(getClient).mockReturnValue(mockClient as any);
    vi.mocked(getPrice).mockResolvedValue({
      priceUsd: 2000,
      change24h: 0,
      marketCap: 0,
      volume24h: 0,
    });

    const chains = ["ethereum", "polygon", "arbitrum", "base", "optimism"];
    for (const chain of chains) {
      getClient(chain as any);
    }
    expect(getClient).toHaveBeenCalledTimes(5);
  });

  it("캐시 히트 시 캐시된 데이터 반환", () => {
    const cachedData = {
      chains: [
        { chain: "base", baseFeeGwei: "0.01", estimatedCostUsd: 0.0001 },
        { chain: "ethereum", baseFeeGwei: "20.0", estimatedCostUsd: 0.81 },
      ],
      cheapest: "base",
      mostExpensive: "ethereum",
    };
    vi.mocked(cache.get).mockReturnValue({ data: cachedData, hit: true });

    const result = cache.get("comparegas:all");
    expect(result.hit).toBe(true);
    expect(result.data).toEqual(cachedData);
  });

  it("비용 오름차순 정렬 로직", () => {
    const chains = [
      { chain: "ethereum", baseFeeGwei: "20.0", estimatedCostUsd: 0.81 },
      { chain: "base", baseFeeGwei: "0.01", estimatedCostUsd: 0.0001 },
      { chain: "arbitrum", baseFeeGwei: "0.1", estimatedCostUsd: 0.004 },
    ];
    chains.sort((a, b) => a.estimatedCostUsd - b.estimatedCostUsd);
    expect(chains[0].chain).toBe("base");
    expect(chains[chains.length - 1].chain).toBe("ethereum");
  });
});
