"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.validatePassword = validatePassword;
const bcrypt_1 = __importDefault(require("bcrypt"));
const SALT_ROUNDS = 10;
/**
 * Hash a password
 */
async function hashPassword(password) {
    return bcrypt_1.default.hash(password, SALT_ROUNDS);
}
/**
 * Compare a password with a hash
 */
async function comparePassword(password, hash) {
    return bcrypt_1.default.compare(password, hash);
}
/**
 * Validate password strength
 */
function validatePassword(password) {
    const errors = [];
    if (password.length < 8) {
        errors.push('密码长度至少8个字符');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('密码必须包含大写字母');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('密码必须包含小写字母');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('密码必须包含数字');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=password.js.map