import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const ACCESS_TOKEN_EXPIRY = '1h' // 1 hour
const REFRESH_TOKEN_EXPIRY = '7d' // 7 days

export interface TokenPayload {
  userId: number
  email: string
  username?: string
}

/**
 * Generate access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  })
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  })
}

/**
 * Verify and decode token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, SECRET) as TokenPayload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

/**
 * Decode token without verification (for getting payload)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload
  } catch (error) {
    console.error('Token decoding failed:', error)
    return null
  }
}
