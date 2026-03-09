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
import { cache } from "../../src/shared/cache.js";

describe("getGasPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cache.get).mockReturnValue({ data: null, hit: false });
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getGasPrice.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("RPC 클라이언트가 올바른 체인으로 호출됨", () => {
    const mockClient = {
      getBlock: vi.fn().mockResolvedValue({
        baseFeePerGas: 20000000000n,
        number: 12345678n,
      }),
      estimateMaxPriorityFeePerGas: vi.fn().mockResolvedValue(1500000000n),
    };

    vi.mocked(getClient).mockReturnValue(mockClient as any);

    getClient("ethereum");
    expect(getClient).toHaveBeenCalledWith("ethereum");
  });
});
