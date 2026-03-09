import { describe, it, expect, vi, beforeEach } from "vitest";
import { getClient, clearClients } from "../../src/shared/rpc-client.js";

describe("rpc-client", () => {
  beforeEach(() => {
    clearClients();
  });

  it("ethereum 클라이언트 생성", () => {
    const client = getClient("ethereum");
    expect(client).toBeDefined();
    expect(client.chain?.id).toBe(1);
  });

  it("polygon 클라이언트 생성", () => {
    const client = getClient("polygon");
    expect(client).toBeDefined();
    expect(client.chain?.id).toBe(137);
  });

  it("동일 체인은 싱글턴 반환", () => {
    const client1 = getClient("ethereum");
    const client2 = getClient("ethereum");
    expect(client1).toBe(client2);
  });

  it("다른 체인은 다른 인스턴스", () => {
    const eth = getClient("ethereum");
    const poly = getClient("polygon");
    expect(eth).not.toBe(poly);
  });

  it("clearClients 후 새 인스턴스 생성", () => {
    const client1 = getClient("ethereum");
    clearClients();
    const client2 = getClient("ethereum");
    expect(client1).not.toBe(client2);
  });

  it("5개 체인 모두 클라이언트 생성 가능", () => {
    const chains = ["ethereum", "polygon", "arbitrum", "base", "optimism"] as const;
    for (const chain of chains) {
      const client = getClient(chain);
      expect(client).toBeDefined();
    }
  });
});
