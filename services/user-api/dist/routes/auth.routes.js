"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const password_1 = require("../lib/password");
const jwt_1 = require("../lib/jwt");
const router = (0, express_1.Router)();
/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        // Validation
        if (!email || !username || !password) {
            return res.status(400).json({
                error: '缺少必填字段',
            });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: '邮箱格式不正确',
            });
        }
        // Validate password strength
        const passwordValidation = (0, password_1.validatePassword)(password);
        if (!passwordValidation.valid) {
            return res.status(400).json({
                error: '密码强度不足',
                details: passwordValidation.errors,
            });
        }
        // Check if email already exists
        const existingEmail = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingEmail) {
            return res.status(400).json({
                error: '邮箱已被注册',
            });
        }
        // Check if username already exists
        const existingUsername = await prisma_1.prisma.user.findUnique({
            where: { username },
        });
        if (existingUsername) {
            return res.status(400).json({
                error: '用户名已被使用',
            });
        }
        // Hash password
        const hashedPassword = await (0, password_1.hashPassword)(password);
        // Create user
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                username,
                passwordHash: hashedPassword,
                role: 'user',
            },
        });
        // Generate tokens
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(tokenPayload);
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
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: '注册失败',
            message: error.message,
        });
    }
});
/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            return res.status(400).json({
                error: '缺少必填字段',
            });
        }
        // Find user by email
        const user = await prisma_1.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return res.status(401).json({
                error: '邮箱或密码错误',
            });
        }
        // Verify password
        const isValid = await (0, password_1.comparePassword)(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({
                error: '邮箱或密码错误',
            });
        }
        // Update last login
        await prisma_1.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        // Generate tokens
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(tokenPayload);
        const refreshToken = (0, jwt_1.generateRefreshToken)(tokenPayload);
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
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: '登录失败',
            message: error.message,
        });
    }
});
/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                error: '缺少 refresh token',
            });
        }
        // Verify refresh token
        const payload = (0, jwt_1.verifyToken)(refreshToken);
        if (!payload) {
            return res.status(401).json({
                error: '无效的 refresh token',
            });
        }
        // Get user
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
        });
        if (!user) {
            return res.status(404).json({
                error: '用户不存在',
            });
        }
        // Generate new access token
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            username: user.username,
        };
        const accessToken = (0, jwt_1.generateAccessToken)(tokenPayload);
        res.json({
            token: {
                accessToken,
            },
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Token 刷新失败',
            message: error.message,
        });
    }
});
/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: '未授权',
            });
        }
        const token = authHeader.substring(7);
        const payload = (0, jwt_1.verifyToken)(token);
        if (!payload) {
            return res.status(401).json({
                error: '无效的 token',
            });
        }
        // Get user
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
        });
        if (!user) {
            return res.status(404).json({
                error: '用户不存在',
            });
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
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            error: '获取用户信息失败',
            message: error.message,
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map