import { Request, Response, NextFunction } from 'express';
import { authMiddleware, adminMiddleware } from '../../src/middleware/auth.middleware';
import jwt from 'jsonwebtoken';

describe('Auth Middleware', () => {
  let req: any;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      path: '/api/users/profile',
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('public routes', () => {
    it('should skip auth for /health route', () => {
      req.path = '/health';
      authMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should skip auth for /.well-known/ routes', () => {
      req.path = '/.well-known/health';
      authMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should skip auth for /api/auth/login', () => {
      req.path = '/api/auth/login';
      authMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should skip auth for /api/auth/register', () => {
      req.path = '/api/auth/register';
      authMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('missing/invalid authorization header', () => {
    it('should return 401 if no authorization header', () => {
      authMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect((res.json as jest.Mock).mock.calls[0][0]).toEqual(
        expect.objectContaining({
          error: 'Unauthorized',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', () => {
      req.headers.authorization = 'Basic dXNlcjpwYXNz';
      authMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('valid JWT token', () => {
    const validPayload = {
      userId: 1,
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
    };
    let token: string;

    beforeEach(() => {
      token = jwt.sign(validPayload, process.env.JWT_SECRET!);
      req.headers.authorization = `Bearer ${token}`;
      req.path = '/api/users/profile';
    });

    it('should call next() with valid token', () => {
      authMiddleware(req as Request, res as Response, next);
      expect(next).toHaveBeenCalled();
    });

    it('should attach user info to request', () => {
      authMiddleware(req as Request, res as Response, next);
      expect(req.user).toEqual(validPayload);
    });

    it('should attach user info including role', () => {
      authMiddleware(req as Request, res as Response, next);
      expect(req.user!.role).toBe('user');
    });
  });

  describe('invalid JWT token', () => {
    beforeEach(() => {
      req.path = '/api/users/profile';
    });

    it('should return 401 for expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 1, email: 'test@example.com', username: 'test' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1s' }
      );
      req.headers.authorization = `Bearer ${expiredToken}`;

      authMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for malformed token', () => {
      req.headers.authorization = 'Bearer not-a-valid-token';

      authMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 for token signed with wrong secret', () => {
      const wrongToken = jwt.sign(
        { userId: 1, email: 'test@example.com', username: 'test' },
        'wrong-secret'
      );
      req.headers.authorization = `Bearer ${wrongToken}`;

      authMiddleware(req as Request, res as Response, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe('Admin Middleware', () => {
  let req: any;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { path: '/api/admin/something' };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should return 401 if no user on request', () => {
    adminMiddleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 if user is not admin', () => {
    req.user = { userId: 1, email: 'user@test.com', username: 'user', role: 'user' };
    adminMiddleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect((res.json as jest.Mock).mock.calls[0][0]).toEqual(
      expect.objectContaining({
        error: 'Forbidden',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() if user has admin role', () => {
    req.user = { userId: 1, email: 'admin@test.com', username: 'admin', role: 'admin' };
    adminMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
