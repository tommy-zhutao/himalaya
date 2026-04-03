import { hashPassword, comparePassword, validatePassword } from '../../src/lib/password'
import { generateAccessToken, generateRefreshToken, verifyToken, TokenPayload } from '../../src/lib/jwt'

describe('Password Utils', () => {
  describe('validatePassword', () => {
    it('should validate a strong password', () => {
      const result = validatePassword('Test1234')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('Test12')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('密码长度至少8个字符')
    })

    it('should reject passwords without uppercase letters', () => {
      const result = validatePassword('test1234')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('密码必须包含大写字母')
    })

    it('should reject passwords without lowercase letters', () => {
      const result = validatePassword('TEST1234')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('密码必须包含小写字母')
    })

    it('should reject passwords without numbers', () => {
      const result = validatePassword('Testabcd')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('密码必须包含数字')
    })

    it('should return all errors for completely invalid password', () => {
      const result = validatePassword('abcde')
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const hash = await hashPassword('Test1234')
      expect(hash).toBeDefined()
      expect(hash).not.toBe('Test1234')
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should produce different hashes for the same password (due to salt)', async () => {
      const hash1 = await hashPassword('Test1234')
      const hash2 = await hashPassword('Test1234')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'Test1234'
      const hash = await hashPassword(password)
      const result = await comparePassword(password, hash)
      expect(result).toBe(true)
    })

    it('should return false for non-matching password and hash', async () => {
      const hash = await hashPassword('Test1234')
      const result = await comparePassword('Wrong1234', hash)
      expect(result).toBe(false)
    })

    it('should return false for empty password', async () => {
      const hash = await hashPassword('Test1234')
      const result = await comparePassword('', hash)
      expect(result).toBe(false)
    })
  })
})

describe('JWT Utils', () => {
  const payload: TokenPayload = {
    userId: 1,
    email: 'test@example.com',
    username: 'testuser',
  }

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(payload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.')
      expect(parts).toHaveLength(3)
    })

    it('should generate different tokens for different payloads', () => {
      const token1 = generateAccessToken(payload)
      const token2 = generateAccessToken({ ...payload, userId: 2 })
      expect(token1).not.toBe(token2)
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(payload)
      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      const parts = token.split('.')
      expect(parts).toHaveLength(3)
    })

    it('should generate a different token than access token for same payload', () => {
      const accessToken = generateAccessToken(payload)
      const refreshToken = generateRefreshToken(payload)
      expect(accessToken).not.toBe(refreshToken)
    })
  })

  describe('verifyToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(payload)
      const decoded = verifyToken(token)
      expect(decoded).not.toBeNull()
      expect(decoded!.userId).toBe(payload.userId)
      expect(decoded!.email).toBe(payload.email)
      expect(decoded!.username).toBe(payload.username)
    })

    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken(payload)
      const decoded = verifyToken(token)
      expect(decoded).not.toBeNull()
      expect(decoded!.userId).toBe(payload.userId)
    })

    it('should return null for an invalid token', () => {
      const decoded = verifyToken('invalid.token.here')
      expect(decoded).toBeNull()
    })

    it('should return null for a token signed with a different secret', () => {
      // Create a token with a different secret using raw jsonwebtoken
      const jwt = require('jsonwebtoken')
      const fakeToken = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' })
      const decoded = verifyToken(fakeToken)
      expect(decoded).toBeNull()
    })

    it('should return null for an expired token', () => {
      const jwt = require('jsonwebtoken')
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1s' })
      const decoded = verifyToken(expiredToken)
      expect(decoded).toBeNull()
    })
  })
})
