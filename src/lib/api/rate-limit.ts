/**
 * Simple in-memory rate limiting utility
 * For production, replace with Redis-based rate limiting (Upstash)
 */

interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  maxRequests: number;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** When the rate limit resets */
  resetAt: Date;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Creates a rate limiter instance
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, maxRequests } = config;
  const store = new Map<string, RateLimitEntry>();

  const cleanup = () => {
    const now = Date.now();
    const entries = Array.from(store.entries());
    for (const [key, entry] of entries) {
      if (entry.resetAt < now) {
        store.delete(key);
      }
    }
  };

  if (typeof setInterval !== 'undefined') {
    setInterval(cleanup, 60_000);
  }

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(identifier);

      if (!entry || entry.resetAt < now) {
        const resetAt = now + windowMs;
        store.set(identifier, { count: 1, resetAt });
        return {
          success: true,
          remaining: maxRequests - 1,
          resetAt: new Date(resetAt),
        };
      }

      if (entry.count >= maxRequests) {
        return {
          success: false,
          remaining: 0,
          resetAt: new Date(entry.resetAt),
        };
      }

      entry.count++;
      return {
        success: true,
        remaining: maxRequests - entry.count,
        resetAt: new Date(entry.resetAt),
      };
    },

    reset(identifier: string): void {
      store.delete(identifier);
    },

    get(identifier: string): RateLimitResult | null {
      const entry = store.get(identifier);
      if (!entry) return null;

      const now = Date.now();
      if (entry.resetAt < now) {
        store.delete(identifier);
        return null;
      }

      return {
        success: entry.count < maxRequests,
        remaining: Math.max(0, maxRequests - entry.count),
        resetAt: new Date(entry.resetAt),
      };
    },
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  /** API general: 100 per minute per IP */
  apiGeneral: createRateLimiter({ windowMs: 60_000, maxRequests: 100 }),

  /** AI chat: 20 per minute per IP */
  aiChat: createRateLimiter({ windowMs: 60_000, maxRequests: 20 }),
};

/**
 * Helper to get identifier from request
 */
export function getRequestIdentifier(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  );
}

/**
 * Helper to create rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };
}

export type { RateLimitConfig, RateLimitResult };
