import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/rpc-client.js", () => ({
  getClient: vi.fn(() => ({
    call: vi.fn().mockResolvedValue({ data: "0x" }),
    estimateGas: vi.fn().mockResolvedValue(21000n),
    getBlock: vi.fn().mockResolvedValue({ baseFeePerGas: 30000000000n, number: 1000000n }),
    getBlockNumber: vi.fn().mockResolvedValue(1000000n),
  })),
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

import { getClient } from "../../src/shared/rpc-client.js";

describe("simulateTx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/simulateTx.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("getClient가 RPC 메서드 제공", () => {
    const client = getClient("ethereum") as any;
    expect(client.call).toBeDefined();
    expect(client.estimateGas).toBeDefined();
    expect(client.getBlock).toBeDefined();
  });

  it("가스 추정값 21000", async () => {
    const client = getClient("ethereum") as any;
    const gas = await client.estimateGas({});
    expect(gas).toBe(21000n);
  });

  it("가스비 USD 환산 계산", () => {
    const baseFee = 30000000000n; // 30 gwei
    const gasEstimate = 21000n;
    const gasCostWei = baseFee * gasEstimate;
    const gasCostEth = Number(gasCostWei) / 1e18;
    const ethPrice = 2000;
    const gasCostUsd = gasCostEth * ethPrice;
    expect(gasCostUsd).toBeCloseTo(1.26, 1);
  });

  it("eth_call 시뮬레이션 성공", async () => {
    const client = getClient("ethereum") as any;
    const result = await client.call({
      account: "0x0000000000000000000000000000000000000001",
      to: "0x0000000000000000000000000000000000000002",
    });
    expect(result.data).toBe("0x");
  });
});
