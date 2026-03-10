import { describe, it, expect } from "vitest";

describe("getTokenTransfers", () => {
  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getTokenTransfers.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });
});
