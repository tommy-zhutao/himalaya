import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthUser {
  userId: number
  email: string
  username: string
  role?: string
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for health check and public routes
  if (req.path.startsWith('/.well-known/') || req.path === '/health') {
    return next()
  }

  // Skip auth for login and register
  if (req.path === '/api/auth/login' || req.path === '/api/auth/register') {
    return next()
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
    })
  }

  const token = authHeader.substring(7)

  try {
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set')
      return res.status(500).json({
        error: 'Server Configuration Error',
        message: 'Authentication service is not properly configured',
      })
    }
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser

    // Add user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    }

    next()
  } catch (error: any) {
    console.error('Token verification failed:', error.message)
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    })
  }
}

/**
 * Admin role middleware
 * Requires user to have admin role
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    })
  }

  next()
}
