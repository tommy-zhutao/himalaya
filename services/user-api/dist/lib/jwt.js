"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.verifyToken = verifyToken;
exports.decodeToken = decodeToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ACCESS_TOKEN_EXPIRY = '1h'; // 1 hour
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days
/**
 * Generate access token
 */
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });
}
/**
 * Generate refresh token
 */
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });
}
/**
 * Verify and decode token
 */
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, SECRET);
    }
    catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}
/**
 * Decode token without verification (for getting payload)
 */
function decodeToken(token) {
    try {
        return jsonwebtoken_1.default.decode(token);
    }
    catch (error) {
        console.error('Token decoding failed:', error);
        return null;
    }
}
//# sourceMappingURL=jwt.js.map