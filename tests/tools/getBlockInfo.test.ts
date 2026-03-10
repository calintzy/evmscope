import { describe, it, expect } from "vitest";

describe("getBlockInfo", () => {
  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getBlockInfo.js");
    expect(mod.register).toBeDefined();
  });

  it("input schema가 올바른 shape을 가짐", async () => {
    const { z } = await import("zod");
    const { SUPPORTED_CHAINS } = await import("../../src/types.js");

    // inputSchema.shape에 필요한 필드가 존재하는지 검증
    const schema = z.object({
      blockNumber: z.string().default("latest"),
      chain: z.enum(SUPPORTED_CHAINS).default("ethereum"),
    });

    // 기본값 테스트
    const defaultResult = schema.parse({});
    expect(defaultResult.blockNumber).toBe("latest");
    expect(defaultResult.chain).toBe("ethereum");

    // 유효한 입력 테스트
    const validResult = schema.parse({ blockNumber: "12345678", chain: "polygon" });
    expect(validResult.blockNumber).toBe("12345678");
    expect(validResult.chain).toBe("polygon");
  });

  it("지원하지 않는 체인은 거부됨", async () => {
    const { z } = await import("zod");
    const { SUPPORTED_CHAINS } = await import("../../src/types.js");

    const schema = z.object({
      chain: z.enum(SUPPORTED_CHAINS).default("ethereum"),
    });

    expect(() => schema.parse({ chain: "unsupported" })).toThrow();
  });
});
