import { Request, Response, NextFunction } from 'express'
import { verifyToken, TokenPayload } from '../lib/jwt'
import { prisma } from '../lib/prisma'

// Extend Express Request to include user
export interface AuthRequest extends Request {
  user?: TokenPayload
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
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
 * Admin authorization middleware
 * Checks if user has admin role
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  // Fetch user from database to check role
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true },
  })

  if (!user) {
    res.status(401).json({
      error: '用户不存在',
    })
    return
  }

  if (user.role !== 'admin') {
    res.status(403).json({
      error: '权限不足，需要管理员权限',
    })
    return
  }

  // Attach user to request with role
  ;(req as AuthRequest).user = {
    ...payload,
    role: user.role,
  }
  next()
}
