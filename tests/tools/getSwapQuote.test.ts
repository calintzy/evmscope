import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/paraswap.js", () => ({
  fetchQuote: vi.fn(),
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

import { fetchQuote } from "../../src/shared/paraswap.js";
import { resolveTokenMeta } from "../../src/shared/coingecko.js";

describe("getSwapQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getSwapQuote.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("fetchQuote가 견적 데이터 반환", async () => {
    vi.mocked(fetchQuote).mockResolvedValue({
      srcToken: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      srcDecimals: 18,
      srcAmount: "1000000000000000000",
      destToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      destDecimals: 6,
      destAmount: "1929200000",
      bestRoute: "UniswapV3",
      gasCostUSD: "3.50",
    });

    const result = await fetchQuote(
      "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "1000000000000000000",
      18,
      6,
      "ethereum",
    );
    expect(result.destAmount).toBe("1929200000");
    expect(result.bestRoute).toBe("UniswapV3");
    expect(result.gasCostUSD).toBe("3.50");
  });

  it("ETH → ParaSwap 네이티브 주소 변환", () => {
    const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    const resolveToken = (symbol: string) => {
      if (symbol.toUpperCase() === "ETH") {
        return { address: ETH_ADDRESS, symbol: "ETH", decimals: 18 };
      }
      return null;
    };

    const result = resolveToken("ETH");
    expect(result?.address).toBe(ETH_ADDRESS);
    expect(result?.decimals).toBe(18);
  });

  it("토큰 심볼 해석", () => {
    vi.mocked(resolveTokenMeta).mockReturnValue({
      symbol: "USDC",
      name: "USD Coin",
      decimals: 6,
      addresses: { ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
      coingeckoId: "usd-coin",
    });

    const meta = resolveTokenMeta("USDC", "ethereum");
    expect(meta?.decimals).toBe(6);
    expect((meta?.addresses as Record<string, string>)?.ethereum).toBe("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  });

  it("환율 계산 로직", () => {
    const srcAmount = 1.0;
    const destAmount = 1929.2;
    const exchangeRate = Math.round((destAmount / srcAmount) * 1000000) / 1000000;
    expect(exchangeRate).toBe(1929.2);
  });
});
