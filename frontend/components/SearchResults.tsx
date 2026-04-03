'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import NewsCard from './NewsCard'
import Pagination from './Pagination'

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

interface SearchPageProps {
  q?: string
  page?: string
}

export default function SearchResults({ q: query, page }: SearchPageProps) {
  const router = useRouter()
  const currentPage = parseInt(page || '1', 10) || 1

  const { data, isLoading, error } = useQuery<NewsResponse>({
    queryKey: ['search', query, currentPage],
    queryFn: async () => {
      if (!query?.trim()) {
        return {
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          }
        }
      }

      const response = await axios.get<NewsResponse>('/api/news/search', {
        params: { q: query, page: currentPage, limit: 20 },
      })
      return response.data
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    retryDelay: 1000,
  })

  const handlePageChange = (targetPage: number) => {
    router.push(`/search?q=${encodeURIComponent(query || '')}&page=${targetPage}`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
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
          <p className="text-sm text-red-600 mb-4">搜索服务暂时不可用，请稍后重试</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            重试
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && data?.data?.length === 0 && query && (
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-lg p-8">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2 5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <p className="text-gray-500 text-lg mb-2">没有找到相关新闻</p>
            <p className="text-sm text-gray-400">试试搜索其他关键词？</p>
          </div>
        </div>
      )}

      {/* Results */}
      {!isLoading && !error && data?.data && data.data.length > 0 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              搜索结果
              {query && (
                <span className="text-blue-600">"{query}"</span>
              )}
            </h2>
            <p className="text-sm text-gray-600">
              找到 {data?.pagination?.total || 0} 条相关新闻
            </p>
          </div>

          {/* News Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  )
}
