'use client'

import { useState, useEffect } from 'react'
import NewsList from '@/components/NewsList'
import SearchBox from '@/components/SearchBox'
import CategoryFilter from '@/components/CategoryFilter'
import { RefreshCw, User, LogOut } from 'lucide-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/authStore'
import Link from 'next/link'

// Create QueryClient outside component to avoid recreating on every render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

export default function HomePage() {
  const [category, setCategory] = useState<string | undefined>()
  const [sort, setSort] = useState<'latest' | 'hot'>('latest')
  const [key, setKey] = useState(0) // Key to force refetch
  
  const { user, isAuthenticated, fetchUser, logout } = useAuthStore()

  // Fetch user on mount
  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // SearchBox handles navigation to /search page internally
  // This callback is just for any additional side effects if needed

  const handleRefresh = () => {
    setKey((prev) => prev + 1)
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  📰
                  <span>AI News Hub</span>
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  智能新闻聚合平台
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Sort Toggle */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setSort('latest')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      sort === 'latest'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    最新
                  </button>
                  <button
                    onClick={() => setSort('hot')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      sort === 'hot'
                        ? 'bg-white text-red-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    热门
                  </button>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  title="刷新"
                >
                  <RefreshCw size={20} />
                </button>

                {/* Auth Buttons */}
                {isAuthenticated && user ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                      <User size={16} className="text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">
                        {user.username}
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="退出"
                    >
                      <LogOut size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      href="/login"
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      登录
                    </Link>
                    <Link
                      href="/register"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
                    >
                      注册
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col lg:flex-row items-start gap-4">
              {/* Search Box */}
              <div className="flex-1 lg:max-w-md">
                <SearchBox onSearch={handleSearch} />
              </div>

              {/* Category Filter */}
              <div className="flex-1 lg:flex-none lg:ml-auto overflow-x-auto">
                <CategoryFilter
                  selectedCategory={category}
                  onSelectCategory={(cat) => {
                    setCategory(cat)
                    setKey((prev) => prev + 1)
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-8">
          <NewsList
            key={`${category}-${sort}-${key}`}
            category={category}
            sort={sort}
          />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                <p>© 2026 AI News Hub. All rights reserved.</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <a href="/about" className="hover:text-blue-600 transition-colors">
                  关于
                </a>
                <a href="/privacy" className="hover:text-blue-600 transition-colors">
                  隐私政策
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  )
}
