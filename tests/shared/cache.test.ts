import { describe, it, expect, beforeEach, vi } from "vitest";
import { cache } from "../../src/shared/cache.js";

describe("cache", () => {
  beforeEach(() => {
    cache.clear();
  });

  it("miss 시 null 반환", () => {
    const result = cache.get("nonexistent");
    expect(result.hit).toBe(false);
    expect(result.data).toBeNull();
  });

  it("set 후 get으로 데이터 조회", () => {
    cache.set("key1", { price: 100 }, 60);
    const result = cache.get<{ price: number }>("key1");
    expect(result.hit).toBe(true);
    expect(result.data).toEqual({ price: 100 });
  });

  it("TTL 만료 시 null 반환", () => {
    vi.useFakeTimers();
    cache.set("key2", "data", 5);

    vi.advanceTimersByTime(6000);
    const result = cache.get("key2");
    expect(result.hit).toBe(false);
    expect(result.data).toBeNull();

    vi.useRealTimers();
  });

  it("TTL 이내에는 데이터 유지", () => {
    vi.useFakeTimers();
    cache.set("key3", "data", 10);

    vi.advanceTimersByTime(5000);
    const result = cache.get<string>("key3");
    expect(result.hit).toBe(true);
    expect(result.data).toBe("data");

    vi.useRealTimers();
  });

  it("getStale은 만료된 데이터도 반환", () => {
    vi.useFakeTimers();
    cache.set("key4", "stale-data", 1);

    vi.advanceTimersByTime(5000);
    const stale = cache.getStale<string>("key4");
    expect(stale).toBe("stale-data");

    vi.useRealTimers();
  });

  it("clear로 전체 삭제", () => {
    cache.set("a", 1, 60);
    cache.set("b", 2, 60);
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
  });
});
