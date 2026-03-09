"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const logging_middleware_1 = require("./middleware/logging.middleware");
const rateLimit_middleware_1 = require("./middleware/rateLimit.middleware");
const proxy_1 = require("./proxy/proxy");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(logging_middleware_1.loggingMiddleware);
// Rate limiting (optional - requires Redis)
if (process.env.REDIS_URL) {
    app.use((0, rateLimit_middleware_1.createRateLimiter)({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100, // 100 requests per minute
    }));
}
// Health check
app.get('/.well-known/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
    });
});
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'api-gateway',
        timestamp: new Date().toISOString(),
    });
});
// Authentication middleware (applied to all API routes)
app.use('/api/*', auth_middleware_1.authMiddleware);
// Proxy routes to downstream services
// News API routes
app.all('/api/news*', async (req, res) => {
    await proxy_1.proxyService.proxyRequest('news', req, res);
});
// User API routes (auth + users)
app.all('/api/auth*', async (req, res) => {
    await proxy_1.proxyService.proxyRequest('user', req, res);
});
app.all('/api/users*', async (req, res) => {
    await proxy_1.proxyService.proxyRequest('user', req, res);
});
// Admin API routes
app.all('/api/admin*', async (req, res) => {
    await proxy_1.proxyService.proxyRequest('admin', req, res);
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.path} not found`,
    });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
    });
});
// Start server
async function start() {
    try {
        app.listen(PORT, () => {
            console.log(`🚀 API Gateway running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`📡 Proxying to:`);
            console.log(`   - News API: ${process.env.NEWS_API_URL || 'http://localhost:4001'}`);
            console.log(`   - User API: ${process.env.USER_API_URL || 'http://localhost:4002'}`);
            console.log(`   - Admin API: ${process.env.ADMIN_API_URL || 'http://localhost:4003'}`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
});
start();
