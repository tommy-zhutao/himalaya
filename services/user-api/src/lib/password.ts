import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Compare a password with a hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('密码长度至少8个字符')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('密码必须包含数字')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
