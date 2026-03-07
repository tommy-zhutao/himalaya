/**
 * Hash a password
 */
export declare function hashPassword(password: string): Promise<string>;
/**
 * Compare a password with a hash
 */
export declare function comparePassword(password: string, hash: string): Promise<boolean>;
/**
 * Validate password strength
 */
export declare function validatePassword(password: string): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=password.d.ts.map