import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { cache } from "../../src/shared/cache.js";

describe("getGovernanceProposals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cache.get).mockReturnValue({ data: null, hit: false });
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getGovernanceProposals.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });
});
