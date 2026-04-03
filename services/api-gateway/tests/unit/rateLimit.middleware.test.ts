import { Request, Response, NextFunction } from 'express';
import { createRateLimiter } from '../../src/middleware/rateLimit.middleware';

// Need to get the mock reference
import Redis from 'ioredis';

describe('Rate Limiting Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      ip: '127.0.0.1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    // Clear all mock state
    jest.clearAllMocks();
  });

  it('should allow requests under the limit', async () => {
    const RedisMock = Redis as unknown as jest.Mock;
    RedisMock.mockImplementation(() => ({
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn().mockResolvedValue(1),
    }));

    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 100 });
    await limiter(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(429);
  });

  it('should block requests at the limit', async () => {
    const RedisMock = Redis as unknown as jest.Mock;
    RedisMock.mockImplementation(() => ({
      get: jest.fn().mockResolvedValue('100'),
      setex: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn().mockResolvedValue(101),
    }));

    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 100 });
    await limiter(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect((res.json as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        error: 'Too Many Requests',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should allow request through on Redis error (fail-open)', async () => {
    const RedisMock = Redis as unknown as jest.Mock;
    RedisMock.mockImplementation(() => ({
      get: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
    }));

    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 100 });
    await limiter(req as Request, res as Response, next);

    // Should allow the request through even on Redis error
    expect(next).toHaveBeenCalled();
  });

  it('should set rate limit headers', async () => {
    const RedisMock = Redis as unknown as jest.Mock;
    RedisMock.mockImplementation(() => ({
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue('OK'),
      incr: jest.fn().mockResolvedValue(1),
    }));

    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 100 });
    await limiter(req as Request, res as Response, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '99');
  });

  it('should use custom key generator if provided', async () => {
    const RedisMock = Redis as unknown as jest.Mock;
    const mockSetex = jest.fn().mockResolvedValue('OK');
    RedisMock.mockImplementation(() => ({
      get: jest.fn().mockResolvedValue(null),
      setex: mockSetex,
      incr: jest.fn().mockResolvedValue(1),
    }));

    const keyGenerator = (req: Request) => `custom:${req.headers['x-api-key']}`;
    const limiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 10,
      keyGenerator,
    });

    req.headers = { 'x-api-key': 'my-key' };
    await limiter(req as Request, res as Response, next);

    expect(mockSetex).toHaveBeenCalledWith(
      'custom:my-key',
      expect.any(Number),
      '1'
    );
  });

  it('should use first request count of 0 to set with expiry', async () => {
    const RedisMock = Redis as unknown as jest.Mock;
    const mockSetex = jest.fn().mockResolvedValue('OK');
    const mockIncr = jest.fn().mockResolvedValue(1);
    RedisMock.mockImplementation(() => ({
      get: jest.fn().mockResolvedValue(null),
      setex: mockSetex,
      incr: mockIncr,
    }));

    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 100 });
    await limiter(req as Request, res as Response, next);

    expect(mockSetex).toHaveBeenCalled();
    expect(mockIncr).not.toHaveBeenCalled();
  });

  it('should increment count for subsequent requests', async () => {
    const RedisMock = Redis as unknown as jest.Mock;
    const mockSetex = jest.fn().mockResolvedValue('OK');
    const mockIncr = jest.fn().mockResolvedValue(5);
    RedisMock.mockImplementation(() => ({
      get: jest.fn().mockResolvedValue('4'),
      setex: mockSetex,
      incr: mockIncr,
    }));

    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 100 });
    await limiter(req as Request, res as Response, next);

    expect(mockIncr).toHaveBeenCalled();
    expect(mockSetex).not.toHaveBeenCalled();
  });
});
