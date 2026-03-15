'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface User {
  id: number
  email: string
  username: string
  role: string
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        localStorage.removeItem('token')
        router.push('/login')
        return
      }

      const data = await response.json()
      if (data.user.role !== 'admin') {
        alert('需要管理员权限')
        router.push('/')
        return
      }

      setUser(data.user)
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg">加载中...</div>
      </div>
    )
  }

  const navItems = [
    { href: '/admin/dashboard', label: '仪表盘', icon: '📊' },
    { href: '/admin/sources', label: '新闻源', icon: '📡' },
    { href: '/admin/news', label: '新闻管理', icon: '📰' },
    { href: '/admin/logs', label: '抓取日志', icon: '📋' },
    { href: '/admin/users', label: '用户管理', icon: '👥' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <span className="text-xl">☰</span>
            </button>
            <h1 className="text-xl font-bold text-gray-800">AI News Hub - 管理后台</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              返回前台
            </Link>
            <span className="text-gray-600">|</span>
            <span className="text-gray-700">{user?.username}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside
          className={`fixed left-0 top-14 bottom-0 bg-white shadow-lg border-r border-gray-200 transition-all duration-300 z-20 ${
            sidebarOpen ? 'w-56' : 'w-0 -translate-x-full'
          }`}
        >
          <nav className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 ${
            sidebarOpen ? 'ml-56' : 'ml-0'
          }`}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
