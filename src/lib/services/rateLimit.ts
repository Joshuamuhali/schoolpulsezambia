/**
 * Rate limiting service
 * Provides client-side and server-side rate limiting
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if request is rate limited
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Clean up expired records
  if (record && now > record.resetAt) {
    rateLimitStore.delete(key);
  }

  const current = rateLimitStore.get(key);

  if (!current) {
    // First request
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt,
    };
  }

  if (now > current.resetAt) {
    // Window expired, reset
    const resetAt = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxAttempts - 1,
      resetAt,
    };
  }

  if (current.count >= config.maxAttempts) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      retryAfter: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  // Increment count
  current.count++;
  return {
    allowed: true,
    remaining: config.maxAttempts - current.count,
    resetAt: current.resetAt,
  };
}

/**
 * Rate limit configurations for different actions
 */
export const RATE_LIMITS = {
  OTP_REQUEST: {
    maxAttempts: 5,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'otp_request',
  },
  SIGNIN: {
    maxAttempts: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'signin',
  },
  PASSWORD_RESET: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'password_reset',
  },
  SIGNUP: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyPrefix: 'signup',
  },
} as const;

/**
 * Get rate limit key for IP-based limiting
 */
export function getRateLimitKey(prefix: string, identifier: string): string {
  return `${prefix}:${identifier}`;
}

/**
 * Get client IP address (for server-side use)
 */
export async function getClientIP(request: Request): Promise<string> {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

/**
 * Rate limit middleware for Edge Functions
 */
export function createRateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Please try again in ${retryAfter} seconds`,
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}

/**
 * Clear rate limit for a key (for testing)
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(key: string): { count: number; resetAt: number } | null {
  const record = rateLimitStore.get(key);
  const now = Date.now();
  
  if (!record || now > record.resetAt) {
    return null;
  }
  
  return record;
}