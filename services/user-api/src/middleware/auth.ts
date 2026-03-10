import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from '../lib/jwt'

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: TokenPayload
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: '未授权，请先登录',
    })
    return
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    res.status(401).json({
      error: '无效的 token 或已过期',
    })
    return
  }

  // Attach user to request
  ;(req as AuthRequest).user = payload
  next()
}

/**
 * Optional auth middleware
 * Attaches user info if token is present, but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (payload) {
      ;(req as AuthRequest).user = payload
    }
  }

  next()
}
