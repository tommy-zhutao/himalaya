import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { verifyToken, TokenPayload } from '../lib/jwt'
import bcrypt from 'bcrypt'

const router = Router()

// Extend Express Request to include user
interface AuthRequest extends Request {
  user?: TokenPayload
}

/**
 * PUT /api/users/me
 * Update current user info
 */
router.put('/me', async (req, res: Response) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '未授权，请先登录',
      })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return res.status(401).json({
        error: '无效的 token 或已过期',
      })
    }

    const { username, avatarUrl, preferences, currentPassword, newPassword } = req.body

    // Get current user
    const existing = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!existing) {
      return res.status(404).json({
        error: '用户不存在',
      })
    }

    // If username is being changed, check for duplicates
    if (username && username !== existing.username) {
      const duplicateUsername = await prisma.user.findUnique({
        where: { username },
      })
      if (duplicateUsername) {
        return res.status(400).json({
          error: '用户名已被使用',
        })
      }
    }

    // If changing password, verify current password
    if (currentPassword && newPassword) {
      const isValidPassword = await bcrypt.compare(currentPassword, existing.passwordHash)
      if (!isValidPassword) {
        return res.status(400).json({
          error: '当前密码不正确',
        })
      }
      if (newPassword.length < 6) {
        return res.status(400).json({
          error: '新密码至少需要 6 个字符',
        })
      }
    }

    // Build update data
    const updateData: any = {}
    if (username) updateData.username = username
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    if (preferences !== undefined) updateData.preferences = preferences
    if (newPassword) {
      const salt = await bcrypt.genSalt(10)
      updateData.passwordHash = await bcrypt.hash(newPassword, salt)
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        preferences: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })

    res.json({
      user,
    })
  } catch (error: any) {
    console.error('Error updating user:', error)
    res.status(500).json({
      error: '更新用户信息失败',
      message: error.message,
    })
  }
})

/**
 * GET /api/users/me
 * Get current user info
 */
router.get('/me', async (req, res: Response) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '未授权，请先登录',
      })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return res.status(401).json({
        error: '无效的 token 或已过期',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        preferences: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        _count: {
          select: { favorites: true },
        },
      },
    })

    if (!user) {
      return res.status(404).json({
        error: '用户不存在',
      })
    }

    res.json({
      user,
    })
  } catch (error: any) {
    console.error('Error fetching user:', error)
    res.status(500).json({
      error: '获取用户信息失败',
      message: error.message,
    })
  }
})

export default router
