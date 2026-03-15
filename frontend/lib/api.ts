import axios from 'axios'

// 浏览器端使用相对路径（通过 Next.js rewrites 代理）
// 服务器端使用 Docker 内部地址
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    // 浏览器端：使用相对路径，由 Next.js rewrites 代理
    return ''
  }
  // 服务器端：使用 Docker 内部地址
  return process.env.NEXT_PUBLIC_API_URL || 'http://api-gateway:4000'
}

const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - 添加 Authorization header
api.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API Error:', error.response.data)
    } else if (error.request) {
      console.error('Network Error:', error.request)
    } else {
      console.error('Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default api
