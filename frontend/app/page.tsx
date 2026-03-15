'use client'

import { useState, useEffect } from 'react'
import NewsList from '@/components/NewsList'
import Recommendations from '@/components/Recommendations'
import TrendingTopics from '@/components/TrendingTopics'
import { RefreshCw, User, LogOut, Heart, Menu, X } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/authStore'
import Link from 'next/link'

export default function HomePage() {
  const [category, setCategory] = useState<string | undefined>()
  const [sort, setSort] = useState<'latest' | 'hot'>('latest')
  const [key, setKey] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { user, isAuthenticated, fetchUser, logout } = useAuthStore()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const handleRefresh = () => {
    setKey((prev) => prev + 1)
  }

  const handleLogout = () => {
    logout()
    setMobileMenuOpen(false)
  }

  const categories = [
    { id: 'all', name: '全部' },
    { id: 'technology', name: '科技' },
    { id: 'ai', name: 'AI' },
    { id: 'business', name: '商业' },
    { id: 'startups', name: '创业' },
    { id: 'finance', name: '金融' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white">
                <span className="text-sm font-bold">N</span>
              </div>
              <span className="font-bold text-gray-900">AI News</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
              >
                <RefreshCw size={18} />
              </button>

              {isAuthenticated && user ? (
                <div className="flex items-center gap-2">
                  <Link href="/favorites" className="p-2 text-gray-500 hover:text-gray-700">
                    <Heart size={18} />
                  </Link>
                  <Link href="/settings" className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
                    ) : (
                      <User size={14} />
                    )}
                    <span className="text-sm text-gray-700">{user.username}</span>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Link href="/login" className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900">
                    登录
                  </Link>
                  <Link href="/register" className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg">
                    注册
                  </Link>
                </div>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-500"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Category Tabs - Scrollable */}
          <div className="px-4 pb-3 overflow-x-auto">
            <div className="flex gap-2">
              {categories.map((cat) => {
                const isSelected = (category === cat.id) || (category === undefined && cat.id === 'all')
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setCategory(cat.id === 'all' ? undefined : cat.id)
                      setKey((prev) => prev + 1)
                    }}
                    className={`px-3 py-1.5 text-sm font-medium whitespace-nowrap rounded-full transition-colors ${
                      isSelected
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sort Toggle */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
              <button
                onClick={() => setSort('latest')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  sort === 'latest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                最新
              </button>
              <button
                onClick={() => setSort('hot')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  sort === 'hot' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                热门
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <nav className="px-4 py-4 space-y-3">
              <Link href="/" className="block py-2 text-gray-900" onClick={() => setMobileMenuOpen(false)}>
                首页
              </Link>
              <Link href="/category/technology" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                科技
              </Link>
              <Link href="/category/ai" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                AI
              </Link>
              <Link href="/category/business" className="block py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                商业
              </Link>

              {isAuthenticated && user ? (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <Link href="/favorites" className="flex items-center gap-2 py-2 text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                    <Heart size={18} /> 我的收藏
                  </Link>
                  <button onClick={handleLogout} className="flex items-center gap-2 py-2 text-red-600">
                    <LogOut size={18} /> 退出
                  </button>
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-100 space-y-2">
                  <Link href="/login" className="block py-2 text-center text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                    登录
                  </Link>
                  <Link href="/register" className="block py-2 text-center bg-gray-900 text-white rounded-lg" onClick={() => setMobileMenuOpen(false)}>
                    注册
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-4">
        {/* Trending Topics */}
        <TrendingTopics />
        
        {/* Personalized Recommendations */}
        <Recommendations />
        
        <NewsList
          category={category}
          sort={sort}
          refreshKey={key}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-8">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>© 2026 AI News Hub</span>
            <div className="flex items-center gap-4">
              <Link href="/about" className="hover:text-gray-700">关于</Link>
              <Link href="/privacy" className="hover:text-gray-700">隐私</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
