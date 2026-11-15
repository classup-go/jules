/**
 * Simple in-memory rate limiter for video streaming API
 * Prevents abuse by limiting requests per user per time window
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store for rate limit records
// Key format: "userId:lessonId" or "userId:endpoint"
const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate limited
 * @param userId - User ID making the request
 * @param resource - Resource being accessed (e.g., lesson ID or endpoint name)
 * @param limit - Maximum number of requests allowed in the time window
 * @param windowMs - Time window in milliseconds (default: 1 minute)
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  userId: string,
  resource: string,
  limit: number = 10,
  windowMs: number = 60000 // 1 minute default
): boolean {
  const key = `${userId}:${resource}`;
  const now = Date.now();

  const record = rateLimitMap.get(key);

  // No record exists or window has expired - allow request
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return true;
  }

  // Check if limit exceeded
  if (record.count >= limit) {
    return false;
  }

  // Increment count and allow request
  record.count++;
  return true;
}

/**
 * Get remaining requests for a user/resource combination
 * @param userId - User ID
 * @param resource - Resource identifier
 * @param limit - Maximum requests allowed
 * @returns number of remaining requests, or limit if no record exists
 */
export function getRemainingRequests(
  userId: string,
  resource: string,
  limit: number = 10
): number {
  const key = `${userId}:${resource}`;
  const now = Date.now();

  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    return limit;
  }

  return Math.max(0, limit - record.count);
}

/**
 * Reset rate limit for a specific user/resource
 * Useful for testing or manual intervention
 */
export function resetRateLimit(userId: string, resource: string): void {
  const key = `${userId}:${resource}`;
  rateLimitMap.delete(key);
}

/**
 * Get time until rate limit resets (in milliseconds)
 */
export function getResetTime(userId: string, resource: string): number | null {
  const key = `${userId}:${resource}`;
  const record = rateLimitMap.get(key);

  if (!record) {
    return null;
  }

  const now = Date.now();
  return Math.max(0, record.resetAt - now);
}
