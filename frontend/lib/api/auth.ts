import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
} from '@/lib/types/auth'

// 浏览器端使用相对路径（通过 Next.js rewrites 代理）
// 服务器端使用 Docker 内部地址
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // 浏览器端：使用相对路径
    return ''
  }
  // 服务器端：使用 Docker 内部地址
  return process.env.NEXT_PUBLIC_API_URL || 'http://api-gateway:4000'
}

class AuthAPI {
  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    // 兼容两种 key：token 和 accessToken
    return localStorage.getItem('token') || localStorage.getItem('accessToken')
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('refreshToken')
  }

  private setTokens(accessToken: string, refreshToken: string) {
    if (typeof window === 'undefined') return
    // 同时设置两种 key，保持兼容性
    localStorage.setItem('token', accessToken)
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
  }

  private clearTokens() {
    if (typeof window === 'undefined') return
    localStorage.removeItem('token')
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '注册失败')
    }

    const result: AuthResponse = await response.json()
    this.setTokens(result.token.accessToken, result.token.refreshToken)
    return result
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '登录失败')
    }

    const result: AuthResponse = await response.json()
    this.setTokens(result.token.accessToken, result.token.refreshToken)
    return result
  }

  async logout() {
    this.clearTokens()
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token')
    }

    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      this.clearTokens()
      throw new Error('Token refresh failed')
    }

    const result: RefreshTokenResponse = await response.json()
    const accessToken = result.token.accessToken
    if (accessToken && refreshToken) {
      this.setTokens(accessToken, refreshToken)
    }
    return result
  }

  async getCurrentUser(): Promise<{ user: User }> {
    const token = this.getAccessToken()
    if (!token) {
      throw new Error('No access token')
    }

    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        try {
          await this.refreshToken()
          const newToken = this.getAccessToken()
          if (!newToken) throw new Error('No access token after refresh')
          
          const retryResponse = await fetch(`${baseUrl}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${newToken}`,
            },
          })
          
          if (!retryResponse.ok) {
            this.clearTokens()
            throw new Error('Failed to get user after token refresh')
          }
          
          return retryResponse.json()
        } catch {
          this.clearTokens()
          throw new Error('Authentication failed')
        }
      }
      throw new Error('Failed to get user')
    }

    return response.json()
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken()
  }

  getAccessTokenValue(): string | null {
    return this.getAccessToken()
  }
}

export const authAPI = new AuthAPI()
