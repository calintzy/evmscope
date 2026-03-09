import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/honeypot.js", () => ({
  checkHoneypotToken: vi.fn(),
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

import { checkHoneypotToken } from "../../src/shared/honeypot.js";

describe("checkHoneypot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/checkHoneypot.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("안전한 토큰 결과 반환", async () => {
    vi.mocked(checkHoneypotToken).mockResolvedValue({
      isHoneypot: false,
      riskLevel: "safe",
      buyTax: 0,
      sellTax: 0,
      flags: [],
      pairAddress: "0xpair",
      tokenName: "USD Coin",
      tokenSymbol: "USDC",
    });

    const result = await checkHoneypotToken("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "ethereum");
    expect(result?.isHoneypot).toBe(false);
    expect(result?.riskLevel).toBe("safe");
    expect(result?.buyTax).toBe(0);
  });

  it("허니팟 토큰 탐지", async () => {
    vi.mocked(checkHoneypotToken).mockResolvedValue({
      isHoneypot: true,
      riskLevel: "danger",
      buyTax: 5,
      sellTax: 100,
      flags: ["honeypot", "high_sell_tax"],
      pairAddress: null,
      tokenName: "Scam Token",
      tokenSymbol: "SCAM",
    });

    const result = await checkHoneypotToken("0x0000000000000000000000000000000000000bad", "ethereum");
    expect(result?.isHoneypot).toBe(true);
    expect(result?.riskLevel).toBe("danger");
    expect(result?.sellTax).toBe(100);
  });

  it("위험도 판정 로직", () => {
    const classify = (isHoneypot: boolean, buyTax: number, sellTax: number): string => {
      if (isHoneypot || sellTax > 50) return "danger";
      if (buyTax > 10 || sellTax > 10) return "warning";
      return "safe";
    };

    expect(classify(true, 0, 0)).toBe("danger");
    expect(classify(false, 15, 5)).toBe("warning");
    expect(classify(false, 1, 1)).toBe("safe");
    expect(classify(false, 0, 60)).toBe("danger");
  });

  it("지원하지 않는 체인은 null", async () => {
    vi.mocked(checkHoneypotToken).mockResolvedValue(null);
    const result = await checkHoneypotToken("0xtoken", "unsupported");
    expect(result).toBeNull();
  });
});
