/**
 * Simple in-memory rate limiter.
 * Tracks requests per IP per window. No external dependencies.
 */

interface RateEntry {
  count: number;
  windowStart: number;
}

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX_REQUESTS = 10;

class RateLimiter {
  private store = new Map<string, RateEntry>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs = DEFAULT_WINDOW_MS, maxRequests = DEFAULT_MAX_REQUESTS) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /**
   * Check if a request is allowed.
   * Returns { allowed: boolean, remaining: number, resetInMs: number }
   */
  check(key: string): { allowed: boolean; remaining: number; resetInMs: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      // New window
      this.store.set(key, { count: 1, windowStart: now });
      return { allowed: true, remaining: this.maxRequests - 1, resetInMs: this.windowMs };
    }

    if (entry.count >= this.maxRequests) {
      const resetInMs = this.windowMs - (now - entry.windowStart);
      return { allowed: false, remaining: 0, resetInMs };
    }

    entry.count++;
    const remaining = this.maxRequests - entry.count;
    const resetInMs = this.windowMs - (now - entry.windowStart);
    return { allowed: true, remaining, resetInMs };
  }
}

// Shared instance for API routes (10 req/min per IP)
export const apiRateLimiter = new RateLimiter(60_000, 10);

/**
 * Helper to extract client IP from request headers.
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
