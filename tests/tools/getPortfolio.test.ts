import { describe, it, expect } from "vitest";

describe("getPortfolio", () => {
  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getPortfolio.js");
    expect(mod.register).toBeDefined();
  });
});
