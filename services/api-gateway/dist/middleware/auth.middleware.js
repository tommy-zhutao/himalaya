"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.adminMiddleware = adminMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
/**
 * Authentication middleware
 * Verifies JWT token and adds user info to request
 */
function authMiddleware(req, res, next) {
    // Skip auth for health check and public routes
    if (req.path.startsWith('/.well-known/') || req.path === '/health') {
        return next();
    }
    // Skip auth for login and register
    if (req.path === '/api/auth/login' || req.path === '/api/auth/register') {
        return next();
    }
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Missing or invalid authorization header',
        });
    }
    const token = authHeader.substring(7);
    try {
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Add user info to request
        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            username: decoded.username,
            role: decoded.role,
        };
        next();
    }
    catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired token',
        });
    }
}
/**
 * Admin role middleware
 * Requires user to have admin role
 */
function adminMiddleware(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required',
        });
    }
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'Admin access required',
        });
    }
    next();
}
