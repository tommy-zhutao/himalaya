export interface TokenPayload {
    userId: number;
    email: string;
    username?: string;
}
/**
 * Generate access token
 */
export declare function generateAccessToken(payload: TokenPayload): string;
/**
 * Generate refresh token
 */
export declare function generateRefreshToken(payload: TokenPayload): string;
/**
 * Verify and decode token
 */
export declare function verifyToken(token: string): TokenPayload | null;
/**
 * Decode token without verification (for getting payload)
 */
export declare function decodeToken(token: string): TokenPayload | null;
//# sourceMappingURL=jwt.d.ts.map