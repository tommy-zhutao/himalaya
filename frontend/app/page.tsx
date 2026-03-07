'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getNews } from '@/lib/news'
import NewsCard from '@/components/NewsCard'
import { Loader2, RefreshCw, Filter } from 'lucide-react'

export default function HomePage() {
  const [page, setPage] = useState(1)
  const [category, setCategory] = useState<string>('')
  const [sort, setSort] = useState<'latest' | 'hot'>('latest')

  // Fetch news
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['news', page, category, sort],
    queryFn: () => getNews({ page, limit: 12, category: category || undefined, sort }),
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 cursor-pointer" onClick={() => {
              setPage(1)
              setCategory('')
            }}>
              📰 AI News Hub
            </h1>

            <div className="flex items-center gap-3">
              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as 'latest' | 'hot')}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="latest">最新</option>
                <option value="hot">热门</option>
              </select>

              {/* Refresh */}
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Filter size={16} />
              分类：
            </span>
            <button
              onClick={() => setCategory('')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                category === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {['technology', 'blockchain', 'cloud'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat)
                  setPage(1)
                }}
                className={`px-3 py-1 text-sm rounded-full transition-colors whitespace-nowrap ${
                  category === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={40} className="text-blue-600 animate-spin" />
            <span className="ml-3 text-gray-600">加载中...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">加载失败，请重试</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* News List */}
        {data && !isLoading && (
          <>
            {data.data.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">暂无新闻</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.data.map((news) => (
                    <NewsCard key={news.id} news={news} />
                  ))}
                </div>

                {/* Pagination */}
                {data.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-12">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={!data.pagination.hasPrev}
                      className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      上一页
                    </button>

                    <span className="text-sm text-gray-600">
                      第 {data.pagination.page} / {data.pagination.totalPages} 页
                    </span>

                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={!data.pagination.hasNext}
                      className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>© 2026 AI News Hub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
