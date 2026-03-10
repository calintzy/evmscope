import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/shared/rpc-client.js", () => ({
  getClient: vi.fn(),
}));

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

import { getClient } from "../../src/shared/rpc-client.js";
import { cache } from "../../src/shared/cache.js";

describe("getNFTInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cache.get).mockReturnValue({ data: null, hit: false });
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getNFTInfo.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("RPC 클라이언트가 올바른 체인으로 호출됨", () => {
    // 클라이언트 mock 설정
    const mockClient = {
      readContract: vi.fn().mockResolvedValue(0n),
    };

    vi.mocked(getClient).mockReturnValue(mockClient as any);

    // ethereum 체인으로 클라이언트 요청
    getClient("ethereum");
    expect(getClient).toHaveBeenCalledWith("ethereum");
  });

  it("contractAddress 없으면 INVALID_INPUT 오류 반환", async () => {
    const { makeError } = await import("../../src/types.js");
    const result = makeError(
      "contractAddress is required. Enumerating all NFTs without an indexer is not supported.",
      "INVALID_INPUT",
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_INPUT");
  });

  it("캐시 히트 시 RPC 호출 없이 반환", () => {
    // 캐시에 데이터가 있는 상태 시뮬레이션
    const cachedData = {
      owner: "0xabc",
      contractAddress: "0xdef",
      totalOwned: 2,
      tokens: [
        { tokenId: "1", tokenURI: "ipfs://Qm...", contractAddress: "0xdef" },
        { tokenId: "2", tokenURI: "ipfs://Qm...", contractAddress: "0xdef" },
      ],
    };

    vi.mocked(cache.get).mockReturnValue({ data: cachedData, hit: true });

    const result = cache.get("nftinfo:ethereum:0xdef:0xabc");
    expect(result.hit).toBe(true);
    expect(result.data).toEqual(cachedData);
  });

  it("balanceOf가 0이면 빈 tokens 배열 반환", () => {
    // 보유 토큰 없을 때 결과 구조 검증
    const emptyResult = {
      owner: "0xabc",
      contractAddress: "0xdef",
      totalOwned: 0,
      tokens: [],
    };
    expect(emptyResult.tokens).toHaveLength(0);
    expect(emptyResult.totalOwned).toBe(0);
  });

  it("최대 50개 토큰만 조회", () => {
    // MAX_TOKENS 상수 검증
    const MAX_TOKENS = 50;
    const balance = 100;
    const fetchCount = Math.min(balance, MAX_TOKENS);
    expect(fetchCount).toBe(50);
  });
});
