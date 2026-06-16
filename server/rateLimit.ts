/**
 * Simple in-memory rate limiter and cache for protecting public endpoints
 * under ad traffic load.
 */

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if a key has exceeded the rate limit.
 * Returns true if the request should be allowed, false if rate limited.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    // New window
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false; // Rate limited
  }

  entry.count++;
  return true;
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000);

// ─── In-Memory Cache ──────────────────────────────────────────────────────────

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

/**
 * Get a cached value, or compute and cache it if missing/expired.
 */
export async function withCache<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const entry = cacheStore.get(key) as CacheEntry<T> | undefined;

  if (entry && now < entry.expiresAt) {
    return entry.value;
  }

  const value = await compute();
  cacheStore.set(key, { value, expiresAt: now + ttlMs });
  return value;
}

/**
 * Invalidate a specific cache key or all keys matching a prefix.
 */
export function invalidateCache(keyOrPrefix: string): void {
  Array.from(cacheStore.keys()).forEach((key) => {
    if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
      cacheStore.delete(key);
    }
  });
}

// Clean up expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(cacheStore.entries()).forEach(([key, entry]) => {
    if (now > entry.expiresAt) {
      cacheStore.delete(key);
    }
  });
}, 10 * 60 * 1000);
