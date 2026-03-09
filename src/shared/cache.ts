interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// HIGH #2: 캐시 크기 상한 (메모리 DoS 방지)
const MAX_CACHE_SIZE = 10000;
const SWEEP_INTERVAL = 60_000; // 60초

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 주기적 만료 엔트리 정리
    this.sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL);
    // 프로세스 종료 시 타이머 정리 (unref로 프로세스 블로킹 방지)
    if (this.sweepTimer && typeof this.sweepTimer.unref === "function") {
      this.sweepTimer.unref();
    }
  }

  get<T>(key: string): { data: T; hit: true } | { data: null; hit: false } {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.store.delete(key);
      return { data: null, hit: false };
    }
    return { data: entry.data as T, hit: true };
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    // 크기 상한 초과 시 가장 오래된 항목 삭제
    if (this.store.size >= MAX_CACHE_SIZE && !this.store.has(key)) {
      const firstKey = this.store.keys().next().value;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }

    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  getStale<T>(key: string): T | null {
    const entry = this.store.get(key);
    return entry ? (entry.data as T) : null;
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  /** 만료된 엔트리 일괄 정리 */
  private sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) this.store.delete(key);
    }
  }
}

export const cache = new Cache();
