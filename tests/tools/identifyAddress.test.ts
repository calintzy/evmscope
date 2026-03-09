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

describe("identifyAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/identifyAddress.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("labels.json에 주요 거래소 포함", async () => {
    const labels = await import("../../src/data/labels.json");
    const addresses = labels.default.map((l: any) => l.address.toLowerCase());

    // Binance
    expect(addresses).toContain("0x28c6c06298d514db089934071355e5743bf21d60");
    // Coinbase
    expect(addresses).toContain("0x503828976d22510aad0339f8d3eeaa0e5fc0e98c");
    // Vitalik
    expect(addresses).toContain("0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
  });

  it("labels.json 카테고리가 올바름", async () => {
    const labels = await import("../../src/data/labels.json");
    const categories = [...new Set(labels.default.map((l: any) => l.category))];

    expect(categories).toContain("exchange");
    expect(categories).toContain("whale");
    expect(categories).toContain("bridge");
    expect(categories).toContain("defi");
  });

  it("protocols.json에 주요 프로토콜 포함", async () => {
    const protocols = await import("../../src/data/protocols.json");
    const names = protocols.default.map((p: any) => p.name);

    expect(names).toContain("Uniswap V3");
    expect(names).toContain("Aave V3");
    expect(names).toContain("Lido");
  });

  it("protocols.json에 멀티체인 주소 포함", async () => {
    const protocols = await import("../../src/data/protocols.json");
    const uniV3 = protocols.default.find((p: any) => p.name === "Uniswap V3");

    expect(uniV3).toBeDefined();
    expect(uniV3.addresses.ethereum).toBeDefined();
    expect(uniV3.addresses.polygon).toBeDefined();
    expect(uniV3.addresses.arbitrum).toBeDefined();
  });

  it("Null Address가 system 카테고리", async () => {
    const labels = await import("../../src/data/labels.json");
    const nullAddr = labels.default.find(
      (l: any) => l.address === "0x0000000000000000000000000000000000000000"
    );

    expect(nullAddr).toBeDefined();
    expect(nullAddr.category).toBe("system");
    expect(nullAddr.tags).toContain("burn");
  });
});
