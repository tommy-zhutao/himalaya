import jwt from 'jsonwebtoken'

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return secret
}

export interface TokenPayload {
  userId: number
  email: string
  username?: string
  role?: string
}

/**
 * Verify and decode token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getSecret()) as TokenPayload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}
