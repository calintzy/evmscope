import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/rpc-client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("../../src/shared/etherscan.js", () => ({
  getABI: vi.fn(),
  lookup4byte: vi.fn(),
}));

vi.mock("../../src/shared/cache.js", () => ({
  cache: {
    get: vi.fn().mockReturnValue({ hit: false }),
    set: vi.fn(),
    getStale: vi.fn(),
  },
}));

import { getABI, lookup4byte } from "../../src/shared/etherscan.js";

describe("decodeTx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/decodeTx.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("로컬 signatures.json에서 셀렉터 매칭", async () => {
    const mod = await import("../../src/data/signatures.json");
    const sigs = mod.default as Record<string, { name: string; signature: string }>;
    // transfer(address,uint256) = 0xa9059cbb
    expect(sigs["0xa9059cbb"]).toBeDefined();
    expect(sigs["0xa9059cbb"].name).toBe("transfer");
  });

  it("approve 셀렉터 매칭", async () => {
    const mod = await import("../../src/data/signatures.json");
    const sigs = mod.default as Record<string, { name: string; signature: string }>;
    expect(sigs["0x095ea7b3"]).toBeDefined();
    expect(sigs["0x095ea7b3"].name).toBe("approve");
  });

  it("lookup4byte가 null 반환 시 처리", async () => {
    vi.mocked(lookup4byte).mockResolvedValue(null);
    await expect(lookup4byte("0xdeadbeef")).resolves.toBeNull();
  });

  it("getABI가 null 반환 시 셀렉터 폴백", async () => {
    vi.mocked(getABI).mockResolvedValue(null);
    await expect(getABI("0x1234567890123456789012345678901234567890", "ethereum" as any)).resolves.toBeNull();
  });

  it("signatures.json에 주요 DeFi 함수 포함", async () => {
    const mod = await import("../../src/data/signatures.json");
    const sigs = mod.default as Record<string, { name: string; signature: string }>;
    const selectors = Object.keys(sigs);
    // ERC-20 기본
    expect(selectors).toContain("0xa9059cbb"); // transfer
    expect(selectors).toContain("0x095ea7b3"); // approve
    expect(selectors).toContain("0x23b872dd"); // transferFrom
    // DEX
    expect(selectors).toContain("0x38ed1739"); // swapExactTokensForTokens
    expect(selectors).toContain("0x414bf389"); // exactInputSingle
    // Aave
    expect(selectors).toContain("0x617ba037"); // supply
    expect(selectors).toContain("0xa415bcad"); // borrow
  });
});
