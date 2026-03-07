import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { hashPassword, comparePassword, validatePassword } from '../lib/password'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../lib/jwt'

const router = Router()

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, username, password } = req.body

    // Validation
    if (!email || !username || !password) {
      return res.status(400).json({
        error: '缺少必填字段',
      })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: '邮箱格式不正确',
      })
    }

    // Validate password strength
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: '密码强度不足',
        details: passwordValidation.errors,
      })
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    })

    if (existingEmail) {
      return res.status(400).json({
        error: '邮箱已被注册',
      })
    }

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUsername) {
      return res.status(400).json({
        error: '用户名已被使用',
      })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: hashedPassword,
        role: 'user',
      },
    })

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    }

    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      token: {
        accessToken,
        refreshToken,
      },
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    res.status(500).json({
      error: '注册失败',
      message: error.message,
    })
  }
})

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: '缺少必填字段',
      })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return res.status(401).json({
        error: '邮箱或密码错误',
      })
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash)

    if (!isValid) {
      return res.status(401).json({
        error: '邮箱或密码错误',
      })
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    }

    const accessToken = generateAccessToken(tokenPayload)
    const refreshToken = generateRefreshToken(tokenPayload)

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
      },
      token: {
        accessToken,
        refreshToken,
      },
    })
  } catch (error: any) {
    console.error('Login error:', error)
    res.status(500).json({
      error: '登录失败',
      message: error.message,
    })
  }
})

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        error: '缺少 refresh token',
      })
    }

    // Verify refresh token
    const payload = verifyToken(refreshToken)

    if (!payload) {
      return res.status(401).json({
        error: '无效的 refresh token',
      })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) {
      return res.status(404).json({
        error: '用户不存在',
      })
    }

    // Generate new access token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    }

    const accessToken = generateAccessToken(tokenPayload)

    res.json({
      token: {
        accessToken,
      },
    })
  } catch (error: any) {
    console.error('Token refresh error:', error)
    res.status(500).json({
      error: 'Token 刷新失败',
      message: error.message,
    })
  }
})

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: '未授权',
      })
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)

    if (!payload) {
      return res.status(401).json({
        error: '无效的 token',
      })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })

    if (!user) {
      return res.status(404).json({
        error: '用户不存在',
      })
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
    })
  } catch (error: any) {
    console.error('Get user error:', error)
    res.status(500).json({
      error: '获取用户信息失败',
      message: error.message,
    })
  }
})

export default router
