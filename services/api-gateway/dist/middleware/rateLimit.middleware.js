"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = createRateLimiter;
const ioredis_1 = __importDefault(require("ioredis"));
/**
 * Rate limiting middleware using Redis
 */
function createRateLimiter(options) {
    const redis = new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
    const { windowMs, maxRequests, keyGenerator } = options;
    return async (req, res, next) => {
        try {
            // Generate key (default: IP-based)
            const key = keyGenerator
                ? keyGenerator(req)
                : `rate-limit:${req.ip || req.connection.remoteAddress}`;
            // Get current request count
            const current = await redis.get(key);
            const requestCount = parseInt(current || '0', 10);
            if (requestCount >= maxRequests) {
                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`,
                    retryAfter: windowMs / 1000,
                });
            }
            // Increment counter
            if (requestCount === 0) {
                // First request in window - set expiry
                await redis.setex(key, Math.ceil(windowMs / 1000), '1');
            }
            else {
                await redis.incr(key);
            }
            // Add rate limit headers
            res.setHeader('X-RateLimit-Limit', maxRequests.toString());
            res.setHeader('X-RateLimit-Remaining', (maxRequests - requestCount - 1).toString());
            next();
        }
        catch (error) {
            console.error('Rate limit error:', error);
            // On Redis error, allow request to pass through
            next();
        }
    };
}
