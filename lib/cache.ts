/**
 * Simple in-memory cache with TTL.
 * Used for frequently-read Firestore docs to reduce read ops.
 */

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const DEFAULT_TTL_MS = 60_000; // 60 seconds

class MemCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private ttl: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttl = ttlMs;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() - entry.ts > this.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.store.set(key, { data, ts: Date.now() });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

export const cache = new MemCache(DEFAULT_TTL_MS);
