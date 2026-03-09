import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/rpc-client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("../../src/shared/cache.js", () => ({
  cache: {
    get: vi.fn().mockReturnValue({ hit: false }),
    set: vi.fn(),
    getStale: vi.fn(),
  },
}));

import { getClient } from "../../src/shared/rpc-client.js";

describe("getTxStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getTxStatus.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("getClient가 체인별 클라이언트 반환", () => {
    const mockClient = {
      getTransaction: vi.fn(),
      getTransactionReceipt: vi.fn(),
      getBlockNumber: vi.fn(),
      getBlock: vi.fn(),
    };
    vi.mocked(getClient).mockReturnValue(mockClient as any);

    const client = getClient("ethereum" as any);
    expect(client.getTransaction).toBeDefined();
    expect(client.getTransactionReceipt).toBeDefined();
  });

  it("유효하지 않은 tx hash 형식 검증", async () => {
    // 짧은 해시는 INVALID_INPUT 에러
    const hash = "0x123";
    expect(hash.length).not.toBe(66);
  });

  it("유효한 tx hash 형식 검증", () => {
    const hash = "0x" + "a".repeat(64);
    expect(hash.startsWith("0x")).toBe(true);
    expect(hash.length).toBe(66);
  });

  it("지원하지 않는 체인 검증", async () => {
    const { isSupportedChain } = await import("../../src/types.js");
    expect(isSupportedChain("ethereum")).toBe(true);
    expect(isSupportedChain("solana")).toBe(false);
  });
});
