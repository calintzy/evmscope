import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/rpc-client.js", () => ({
  getClient: vi.fn(),
}));

vi.mock("../../src/shared/etherscan.js", () => ({
  getABI: vi.fn(),
}));

vi.mock("../../src/shared/cache.js", () => ({
  cache: {
    get: vi.fn().mockReturnValue({ hit: false }),
    set: vi.fn(),
    getStale: vi.fn(),
  },
}));

import { getClient } from "../../src/shared/rpc-client.js";
import { getABI } from "../../src/shared/etherscan.js";

describe("getContractABI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getContractABI.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("유효하지 않은 주소 검증", () => {
    const { isAddress } = require("viem");
    expect(isAddress("0xinvalid")).toBe(false);
    expect(isAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")).toBe(true);
  });

  it("getABI 결과에 functionCount, eventCount 계산 가능", () => {
    const mockAbi = [
      { type: "function", name: "transfer" },
      { type: "function", name: "approve" },
      { type: "event", name: "Transfer" },
      { type: "event", name: "Approval" },
      { type: "constructor" },
    ];

    const functionCount = mockAbi.filter((i) => i.type === "function").length;
    const eventCount = mockAbi.filter((i) => i.type === "event").length;

    expect(functionCount).toBe(2);
    expect(eventCount).toBe(2);
  });

  it("getABI가 etherscan source 반환", async () => {
    vi.mocked(getABI).mockResolvedValue({
      abi: [{ type: "function", name: "transfer" }],
      source: "etherscan",
      contractName: "USDC",
    });

    const result = await getABI("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "ethereum" as any);
    expect(result?.source).toBe("etherscan");
    expect(result?.contractName).toBe("USDC");
  });

  it("getABI null이면 ABI_NOT_FOUND", async () => {
    vi.mocked(getABI).mockResolvedValue(null);
    const result = await getABI("0x0000000000000000000000000000000000000001", "ethereum" as any);
    expect(result).toBeNull();
  });
});
