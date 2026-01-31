/**
 * Resolution Cache
 * Caches ID Link resolution results in memory and chrome.storage.local
 */

import type { ResolutionResult } from './types';

/** Cache entry with expiration */
export interface CacheEntry {
  result: ResolutionResult;
  expiresAt: number;
}

/** Storage key prefix for persisted cache entries */
const STORAGE_PREFIX = 'idlink_cache_';

/** Default TTL for successful resolutions (1 hour) */
const DEFAULT_SUCCESS_TTL = 3600000;

/** TTL for failed resolutions (5 minutes) */
const FAILURE_TTL = 300000;

/**
 * Resolution cache with memory + storage persistence
 * Uses LRU eviction and TTL-based expiration
 */
export class ResolutionCache {
  private memoryCache = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly defaultTTL: number;

  constructor(options?: { maxEntries?: number; defaultTTL?: number }) {
    this.maxEntries = options?.maxEntries ?? 100;
    this.defaultTTL = options?.defaultTTL ?? DEFAULT_SUCCESS_TTL;
  }

  /**
   * Get a cached result by URL
   */
  async get(url: string): Promise<ResolutionResult | null> {
    const key = this.normalizeKey(url);
    const now = Date.now();

    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry) {
      if (memEntry.expiresAt > now) {
        return memEntry.result;
      }
      // Expired - remove from memory
      this.memoryCache.delete(key);
    }

    // Check storage
    try {
      const storageKey = STORAGE_PREFIX + key;
      const stored = await chrome.storage.local.get(storageKey);
      const entry = stored[storageKey] as CacheEntry | undefined;

      if (entry && entry.expiresAt > now) {
        // Restore to memory cache
        this.memoryCache.set(key, entry);
        return entry.result;
      }

      // Expired or not found - clean up storage
      if (entry) {
        await chrome.storage.local.remove(storageKey);
      }
    } catch {
      // Storage access failed, continue without cache
    }

    return null;
  }

  /**
   * Cache a resolution result
   */
  async set(
    url: string,
    result: ResolutionResult,
    ttl?: number
  ): Promise<void> {
    const key = this.normalizeKey(url);

    // Determine TTL based on result status
    const effectiveTTL =
      ttl ??
      (result.status === 'failed' || result.status === 'cancelled'
        ? FAILURE_TTL
        : this.defaultTTL);

    const entry: CacheEntry = {
      result,
      expiresAt: Date.now() + effectiveTTL,
    };

    // Check if we need to evict (LRU)
    if (
      this.memoryCache.size >= this.maxEntries &&
      !this.memoryCache.has(key)
    ) {
      await this.evictOldest();
    }

    // Store in memory
    this.memoryCache.set(key, entry);

    // Persist to storage
    try {
      const storageKey = STORAGE_PREFIX + key;
      await chrome.storage.local.set({ [storageKey]: entry });
    } catch {
      // Storage write failed, memory cache still works
    }
  }

  /**
   * Invalidate a cached entry
   */
  async invalidate(url: string): Promise<void> {
    const key = this.normalizeKey(url);

    this.memoryCache.delete(key);

    try {
      await chrome.storage.local.remove(STORAGE_PREFIX + key);
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    try {
      const allStorage = await chrome.storage.local.get(null);
      const cacheKeys = Object.keys(allStorage).filter((k) =>
        k.startsWith(STORAGE_PREFIX)
      );
      if (cacheKeys.length > 0) {
        await chrome.storage.local.remove(cacheKeys);
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Remove expired entries from storage
   */
  async prune(): Promise<void> {
    const now = Date.now();

    // Prune memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }

    // Prune storage
    try {
      const allStorage = await chrome.storage.local.get(null);
      const expiredKeys: string[] = [];

      for (const [key, value] of Object.entries(allStorage)) {
        if (key.startsWith(STORAGE_PREFIX)) {
          const entry = value as CacheEntry;
          if (entry.expiresAt <= now) {
            expiredKeys.push(key);
          }
        }
      }

      if (expiredKeys.length > 0) {
        await chrome.storage.local.remove(expiredKeys);
      }
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Normalize URL to cache key
   */
  private normalizeKey(url: string): string {
    try {
      const parsed = new URL(url);
      // Normalize: lowercase host, remove trailing slash, sort query params
      parsed.host = parsed.host.toLowerCase();
      parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
      // Sort search params for consistent key
      const params = new URLSearchParams(parsed.search);
      const sortedParams = new URLSearchParams(
        [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      );
      parsed.search = sortedParams.toString();
      return parsed.toString();
    } catch {
      // If URL parsing fails, use as-is
      return url;
    }
  }

  /**
   * Evict oldest entry (LRU)
   */
  private async evictOldest(): Promise<void> {
    // Map maintains insertion order, so first entry is oldest
    const firstKey = this.memoryCache.keys().next().value;
    if (firstKey) {
      this.memoryCache.delete(firstKey);
      try {
        await chrome.storage.local.remove(STORAGE_PREFIX + firstKey);
      } catch {
        // Ignore storage errors
      }
    }
  }
}
