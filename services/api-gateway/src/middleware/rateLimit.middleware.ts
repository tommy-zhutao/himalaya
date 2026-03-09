import { Request, Response, NextFunction } from 'express'
import Redis from 'ioredis'

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
  keyGenerator?: (req: Request) => string
}

/**
 * Rate limiting middleware using Redis
 */
export function createRateLimiter(options: RateLimitOptions) {
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
  const { windowMs, maxRequests, keyGenerator } = options

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate key (default: IP-based)
      const key = keyGenerator
        ? keyGenerator(req)
        : `rate-limit:${req.ip || req.connection.remoteAddress}`

      // Get current request count
      const current = await redis.get(key)
      const requestCount = parseInt(current || '0', 10)

      if (requestCount >= maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`,
          retryAfter: windowMs / 1000,
        })
      }

      // Increment counter
      if (requestCount === 0) {
        // First request in window - set expiry
        await redis.setex(key, Math.ceil(windowMs / 1000), '1')
      } else {
        await redis.incr(key)
      }

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString())
      res.setHeader('X-RateLimit-Remaining', (maxRequests - requestCount - 1).toString())

      next()
    } catch (error) {
      console.error('Rate limit error:', error)
      // On Redis error, allow request to pass through
      next()
    }
  }
}
