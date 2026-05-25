import { NextRequest } from "next/server";

/**
 * In-memory rate limiter using Map().
 * Designed for single-instance deployment.
 * No external dependencies required.
 */

interface RateLimitOptions {
  windowMs: number;   // time window in milliseconds
  max: number;        // max requests per window
  identifier: string; // unique key prefix (e.g. 'auth:login')
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: Date;
}

interface StoreEntry {
  count: number;
  resetAt: number;
}

// In-memory store: key = "identifier:ip", value = { count, resetAt }
const store = new Map<string, StoreEntry>();

// Singleton flag for cleanup interval
let cleanupInitialized = false;

/**
 * Extract client IP from request headers.
 * Checks x-forwarded-for (first value), then x-real-ip, then falls back to 127.0.0.1.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Clean up expired entries from the store.
 * Removes entries where resetAt < Date.now().
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

/**
 * Initialize the cleanup interval (runs once via module-level singleton).
 * Every 5 minutes, delete entries where resetAt < Date.now().
 */
function initCleanup(): void {
  if (!cleanupInitialized) {
    cleanupInitialized = true;
    setInterval(() => {
      cleanupExpiredEntries();
    }, 5 * 60 * 1000); // 5 minutes
  }
}

/**
 * Rate limit a request based on IP address and identifier.
 *
 * @param request - The NextRequest object
 * @param options - Rate limit configuration
 * @returns RateLimitResult indicating whether the request is allowed
 */
export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): RateLimitResult {
  // Ensure cleanup is initialized
  initCleanup();

  const ip = getClientIp(request);
  const key = `${options.identifier}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // No entry or expired window — start fresh
    const resetAt = now + options.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      success: true,
      remaining: options.max - 1,
      resetAt: new Date(resetAt),
    };
  }

  // Entry exists and window is still active
  if (entry.count >= options.max) {
    // Limit exceeded
    return {
      success: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
    };
  }

  // Increment count
  entry.count += 1;
  store.set(key, entry);

  return {
    success: true,
    remaining: options.max - entry.count,
    resetAt: new Date(entry.resetAt),
  };
}
