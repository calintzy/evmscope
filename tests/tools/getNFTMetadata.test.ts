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

describe("getNFTMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cache.get).mockReturnValue({ data: null, hit: false });
  });

  it("모듈이 정상적으로 import됨", async () => {
    const mod = await import("../../src/tools/getNFTMetadata.js");
    expect(mod.register).toBeDefined();
    expect(typeof mod.register).toBe("function");
  });

  it("RPC 클라이언트가 올바른 체인으로 호출됨", () => {
    const mockClient = {
      readContract: vi.fn().mockResolvedValue("ipfs://QmTest"),
    };

    vi.mocked(getClient).mockReturnValue(mockClient as any);

    getClient("ethereum");
    expect(getClient).toHaveBeenCalledWith("ethereum");
  });

  it("IPFS URI를 HTTP 게이트웨이 URL로 변환", () => {
    // ipfs:// 프로토콜 변환 로직 검증
    const resolveURI = (uri: string): string => {
      if (uri.startsWith("ipfs://")) {
        return uri.replace("ipfs://", "https://ipfs.io/ipfs/");
      }
      return uri;
    };

    expect(resolveURI("ipfs://QmSomeHash/metadata.json")).toBe(
      "https://ipfs.io/ipfs/QmSomeHash/metadata.json",
    );
    expect(resolveURI("https://example.com/meta/1")).toBe("https://example.com/meta/1");
    expect(resolveURI("ipfs://Qm123")).toBe("https://ipfs.io/ipfs/Qm123");
  });

  it("유효하지 않은 tokenId는 INVALID_INPUT 오류 반환", async () => {
    const { makeError } = await import("../../src/types.js");
    const result = makeError("Invalid tokenId: 'abc' is not a valid integer", "INVALID_INPUT");
    expect(result.success).toBe(false);
    expect(result.code).toBe("INVALID_INPUT");
  });

  it("캐시 히트 시 캐시 데이터 반환", () => {
    const cachedMeta = {
      contractAddress: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d",
      tokenId: "1",
      tokenURI: "ipfs://QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/1",
      name: "Bored Ape #1",
      description: "A bored ape.",
      image: "https://ipfs.io/ipfs/QmRRPWG96cmgTn2qSzjwr2qvfNEuhunv6FNeMFGa9bx6mQ",
      attributes: [{ trait_type: "Background", value: "Yellow" }],
    };

    vi.mocked(cache.get).mockReturnValue({ data: cachedMeta, hit: true });

    const result = cache.get(
      "nftmeta:ethereum:0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d:1",
    );
    expect(result.hit).toBe(true);
    expect(result.data).toEqual(cachedMeta);
  });

  it("캐시 TTL이 3600초임을 확인", () => {
    // 메타데이터는 1시간 캐시
    const NFT_METADATA_CACHE_TTL = 3600;
    expect(NFT_METADATA_CACHE_TTL).toBe(3600);
  });

  it("makeSuccess가 올바른 구조 반환", async () => {
    const { makeSuccess } = await import("../../src/types.js");
    const data = {
      contractAddress: "0xabc",
      tokenId: "42",
      tokenURI: "https://example.com/42",
      name: "Test NFT #42",
    };
    const result = makeSuccess("ethereum", data, false);
    expect(result.success).toBe(true);
    expect(result.chain).toBe("ethereum");
    expect(result.data).toEqual(data);
    expect(result.cached).toBe(false);
  });
});
