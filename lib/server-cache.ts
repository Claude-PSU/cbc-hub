/**
 * A simple server-side in-memory cache with TTL support.
 *
 * Usage:
 *   const cache = new ServerCache<MyType>(12 * 60 * 60 * 1000); // 12hr TTL
 *   const data = await cache.get("key", () => fetchSomething());
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class ServerCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private ttl: number;

  /** @param ttlMs - time-to-live in milliseconds */
  constructor(ttlMs: number) {
    this.ttl = ttlMs;
  }

  /**
   * Returns the cached value for `key` if still valid,
   * otherwise calls `fetcher`, stores the result, and returns it.
   */
  async get(key: string, fetcher: () => Promise<T>): Promise<T> {
    const entry = this.store.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.value;
    }

    const value = await fetcher();
    this.store.set(key, { value, expiresAt: Date.now() + this.ttl });
    return value;
  }

  /** Manually invalidate a cached key. */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Invalidate all cached entries. */
  clear(): void {
    this.store.clear();
  }
}
