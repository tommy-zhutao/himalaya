'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useParams } from 'next/navigation'
import NewsCard from '@/components/NewsCard'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface NewsItem {
  id: number
  title: string
  summary: string
  author: string
  source?: {
    id: number
    name: string
    type: string
  }
  publishedAt?: string
  imageUrl?: string | null
  category?: string | null
  tags?: string[]
}

interface NewsResponse {
  data: NewsItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Category display names in Chinese
const CATEGORY_NAMES: Record<string, string> = {
  technology: '科技',
  ai: '人工智能',
  business: '商业',
  science: '科学',
  health: '健康',
  entertainment: '娱乐',
  sports: '体育',
  world: '国际',
  politics: '政治',
}

export default function CategoryPage() {
  const params = useParams()
  const slug = params?.slug as string
  const categoryName = CATEGORY_NAMES[slug] || slug

  const { data, isLoading, error } = useQuery<NewsResponse>({
    queryKey: ['category', slug],
    queryFn: async () => {
      const response = await axios.get<NewsResponse>('/api/news', {
        params: { category: slug, limit: 20 },
      })
      return response.data
    },
    staleTime: 5 * 60 * 1000,
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {categoryName}
              </h1>
              <p className="text-sm text-gray-500">
                {data?.pagination?.total || 0} 条新闻
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center text-gray-500">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-sm">加载中...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
            <h3 className="text-lg font-semibold text-red-700 mb-2">加载失败</h3>
            <p className="text-sm text-red-600 mb-4">无法加载新闻，请稍后重试</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && data?.data?.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gray-50 rounded-lg p-8">
              <p className="text-gray-500 text-lg mb-2">该分类下暂无新闻</p>
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-700"
              >
                返回首页
              </Link>
            </div>
          </div>
        )}

        {/* News Grid */}
        {!isLoading && !error && data?.data && data.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.data.map((newsItem) => (
              <NewsCard
                key={newsItem.id}
                id={newsItem.id}
                title={newsItem.title}
                summary={newsItem.summary}
                author={newsItem.author}
                source={newsItem.source}
                publishedAt={newsItem.publishedAt}
                imageUrl={newsItem.imageUrl}
                category={newsItem.category}
                tags={newsItem.tags}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
