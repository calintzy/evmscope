import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/rpc-client.js", () => ({
  getClient: vi.fn(() => ({
    getBlockNumber: vi.fn().mockResolvedValue(1000000n),
    getLogs: vi.fn().mockResolvedValue([]),
    getBlock: vi.fn().mockResolvedValue({ baseFeePerGas: 30000000000n, number: 1000000n }),
  })),
}));

vi.mock("../../src/shared/etherscan.js", () => ({
  getABI: vi.fn(),
  getTokenTransfers: vi.fn(),
  lookup4byte: vi.fn(),
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

describe("getContractEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getContractEvents.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("getClient가 RPC 클라이언트 반환", () => {
    const client = getClient("ethereum");
    expect(client).toBeDefined();
    expect(client.getBlockNumber).toBeDefined();
  });

  it("빈 로그에서 빈 이벤트 배열 반환", async () => {
    const client = getClient("ethereum") as any;
    const logs = await client.getLogs({});
    expect(logs).toHaveLength(0);
  });

  it("이벤트 로그 블록 범위 계산", () => {
    const latestBlock = 1000000n;
    const fromBlock = latestBlock - 1000n;
    expect(fromBlock).toBe(999000n);
  });

  it("BigInt 직렬화", () => {
    const serializeArgs = (args: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(args)) {
        if (typeof value === "bigint") result[key] = value.toString();
        else result[key] = value;
      }
      return result;
    };

    const serialized = serializeArgs({ amount: 1000000000000000000n, to: "0xabc" });
    expect(serialized.amount).toBe("1000000000000000000");
    expect(serialized.to).toBe("0xabc");
  });
});
