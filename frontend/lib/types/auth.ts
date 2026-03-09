export interface User {
  id: string
  email: string
  username: string
  role: 'user' | 'admin'
  createdAt: string
  lastLoginAt?: string
}

export interface Token {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: User
  token: Token
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  token: {
    accessToken: string
  }
}
