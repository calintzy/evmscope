interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class Cache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): { data: T; hit: true } | { data: null; hit: false } {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      if (entry) this.store.delete(key);
      return { data: null, hit: false };
    }
    return { data: entry.data as T, hit: true };
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
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
}

export const cache = new Cache();
