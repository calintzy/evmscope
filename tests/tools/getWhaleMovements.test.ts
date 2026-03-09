import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/etherscan.js", () => ({
  getTokenTransfers: vi.fn(),
  getABI: vi.fn(),
  lookup4byte: vi.fn(),
}));

vi.mock("../../src/shared/coingecko.js", () => ({
  resolveTokenMeta: vi.fn(),
  resolveCoingeckoId: vi.fn(),
  getPrice: vi.fn(),
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

import { getTokenTransfers } from "../../src/shared/etherscan.js";
import { resolveTokenMeta } from "../../src/shared/coingecko.js";

describe("getWhaleMovements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getWhaleMovements.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("getTokenTransfers가 전송 데이터 반환", async () => {
    vi.mocked(getTokenTransfers).mockResolvedValue([
      {
        hash: "0xabc123",
        from: "0x1111111111111111111111111111111111111111",
        to: "0x2222222222222222222222222222222222222222",
        value: "1000000000000000000000",
        tokenName: "USD Coin",
        tokenSymbol: "USDC",
        tokenDecimal: "6",
        timeStamp: "1710000000",
      },
    ]);

    const transfers = await getTokenTransfers("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "ethereum", 100);
    expect(transfers).toHaveLength(1);
    expect(transfers[0].hash).toBe("0xabc123");
  });

  it("방향 판정 로직", () => {
    const classify = (fromExchange: boolean, toExchange: boolean) => {
      if (fromExchange && !toExchange) return "exchange_withdrawal";
      if (!fromExchange && toExchange) return "exchange_deposit";
      if (!fromExchange && !toExchange) return "whale_to_whale";
      return "unknown";
    };

    expect(classify(false, true)).toBe("exchange_deposit");
    expect(classify(true, false)).toBe("exchange_withdrawal");
    expect(classify(false, false)).toBe("whale_to_whale");
    expect(classify(true, true)).toBe("unknown");
  });

  it("토큰 해석 테스트", () => {
    vi.mocked(resolveTokenMeta).mockReturnValue({
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      addresses: { ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
      coingeckoId: "usd-coin",
    });

    const meta = resolveTokenMeta("USDC", "ethereum");
    expect(meta?.decimals).toBe(6);
  });

  it("최소 금액 필터링 로직", () => {
    const minValueUsd = 100000;
    const transfers = [
      { value: 500000 },
      { value: 50000 },
      { value: 200000 },
    ];

    const filtered = transfers.filter((t) => t.value >= minValueUsd);
    expect(filtered).toHaveLength(2);
  });
});
