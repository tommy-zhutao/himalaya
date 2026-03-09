"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyService = void 0;
const axios_1 = __importDefault(require("axios"));
class ProxyService {
    constructor() {
        this.services = {
            news: {
                baseUrl: process.env.NEWS_API_URL || 'http://localhost:4001',
                timeout: 30000,
            },
            user: {
                baseUrl: process.env.USER_API_URL || 'http://localhost:4002',
                timeout: 30000,
            },
            admin: {
                baseUrl: process.env.ADMIN_API_URL || 'http://localhost:4003',
                timeout: 30000,
            },
        };
    }
    /**
     * Proxy request to downstream service
     */
    async proxyRequest(serviceName, req, res) {
        const service = this.services[serviceName];
        if (!service) {
            res.status(502).json({
                error: 'Bad Gateway',
                message: `Unknown service: ${serviceName}`,
            });
            return;
        }
        try {
            // Build target URL
            const targetPath = req.path.replace(`/api/${serviceName}`, '');
            const targetUrl = `${service.baseUrl}${targetPath}`;
            // Build request config
            const config = {
                method: req.method,
                url: targetUrl,
                params: req.query,
                data: req.body,
                headers: {
                    'Content-Type': 'application/json',
                    ...(req.user && {
                        'X-User-Id': req.user.userId,
                        'X-User-Email': req.user.email,
                        'X-User-Username': req.user.username,
                        'X-User-Role': req.user.role || 'user',
                    }),
                },
                timeout: service.timeout,
            };
            // Forward authorization header if present
            if (req.headers.authorization) {
                config.headers['Authorization'] = req.headers.authorization;
            }
            // Make request
            const response = await (0, axios_1.default)(config);
            // Forward response
            res.status(response.status).json(response.data);
            return;
        }
        catch (error) {
            console.error(`Proxy error for ${serviceName}:`, error.message);
            if (error.response) {
                // Forward error from downstream service
                res.status(error.response.status).json(error.response.data);
            }
            else if (error.code === 'ECONNREFUSED') {
                res.status(503).json({
                    error: 'Service Unavailable',
                    message: `${serviceName} service is not available`,
                });
            }
            else {
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'Proxy request failed',
                });
            }
            return;
        }
    }
}
exports.proxyService = new ProxyService();
