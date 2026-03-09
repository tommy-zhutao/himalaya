"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingMiddleware = loggingMiddleware;
/**
 * Request logging middleware
 * Logs all incoming requests with method, path, and response time
 */
function loggingMiddleware(req, res, next) {
    const start = Date.now();
    // Log request
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`;
        if (res.statusCode >= 400) {
            console.error(logMessage);
        }
        else {
            console.log(logMessage);
        }
    });
    next();
}
