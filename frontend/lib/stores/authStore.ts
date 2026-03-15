import { create } from 'zustand'
import { User } from '@/lib/types/auth'
import { authAPI } from '@/lib/api/auth'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  fetchUser: () => Promise<void>
  clearError: () => void
  checkAuth: () => void
}

// 检查 localStorage 是否有 token
const getInitialAuthState = () => {
  if (typeof window === 'undefined') {
    return false
  }
  return !!localStorage.getItem('token') || !!localStorage.getItem('accessToken')
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: typeof window !== 'undefined' ? getInitialAuthState() : false,
  isLoading: false,
  error: null,

  checkAuth: () => {
    if (typeof window !== 'undefined') {
      const hasToken = !!localStorage.getItem('token') || !!localStorage.getItem('accessToken')
      set({ isAuthenticated: hasToken })
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authAPI.login({ email, password })
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.message || '登录失败',
        isLoading: false,
      })
      throw error
    }
  },

  register: async (email: string, username: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await authAPI.register({ email, username, password })
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.message || '注册失败',
        isLoading: false,
      })
      throw error
    }
  },

  logout: () => {
    authAPI.logout()
    set({
      user: null,
      isAuthenticated: false,
      error: null,
    })
  },

  fetchUser: async () => {
    if (!authAPI.isAuthenticated()) {
      set({ isAuthenticated: false, user: null })
      return
    }

    set({ isLoading: true })
    try {
      const response = await authAPI.getCurrentUser()
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))
