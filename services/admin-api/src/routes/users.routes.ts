import { Router, Response } from 'express'
import { prisma } from '../lib/prisma'
import { requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

// All routes require admin authentication
router.use(requireAdmin)

/**
 * GET /api/admin/users
 * Get all users with pagination
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
    const search = req.query.search as string | undefined

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: { favorites: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({
      success: false,
      error: '获取用户列表失败',
    })
  }
})

/**
 * GET /api/admin/users/:id
 * Get single user by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        preferences: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        _count: {
          select: { favorites: true },
        },
      },
    })

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      })
    }

    res.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    res.status(500).json({
      success: false,
      error: '获取用户信息失败',
    })
  }
})

/**
 * PUT /api/admin/users/:id
 * Update user info
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { username, avatarUrl, isActive } = req.body

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
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
          success: false,
          error: '用户名已被使用',
        })
      }
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        username: username || existing.username,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : existing.avatarUrl,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    })

    res.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Error updating user:', error)
    res.status(500).json({
      success: false,
      error: '更新用户失败',
    })
  }
})

/**
 * DELETE /api/admin/users/:id
 * Delete user (soft delete by setting isActive = false)
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      })
    }

    // Prevent deleting admin users
    if (existing.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: '不能删除管理员用户',
      })
    }

    // Soft delete
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    })

    res.json({
      success: true,
      message: '用户已禁用',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({
      success: false,
      error: '删除用户失败',
    })
  }
})

/**
 * PUT /api/admin/users/:id/role
 * Update user role
 */
router.put('/:id/role', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { role } = req.body

    // Validate role
    const validRoles = ['user', 'admin']
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: '无效的角色，有效角色: user, admin',
      })
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    })

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      })
    }

    // Prevent changing own role
    if (existing.id === req.user?.userId) {
      return res.status(403).json({
        success: false,
        error: '不能修改自己的角色',
      })
    }

    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { role },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
      },
    })

    res.json({
      success: true,
      data: user,
      message: `用户角色已更新为 ${role}`,
    })
  } catch (error) {
    console.error('Error updating user role:', error)
    res.status(500).json({
      success: false,
      error: '更新用户角色失败',
    })
  }
})

export default router
