'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import NewsCard from '@/components/NewsCard'
import { Loader2, AlertCircle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

interface News {
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

interface SearchResult {
  query: string
  data: News[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export default function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || undefined
  const page = parseInt(searchParams.get('page') || '1')

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<SearchResult>({
    queryKey: ['search', query, category, page],
    queryFn: async () => {
      const params: any = {
        q: query,
        page,
        limit: 20,
      }
      if (category) params.category = category

      const response = await axios.get('/api/news/search', { params })
      return response.data
    },
    enabled: query.length > 0,
    refetchOnWindowFocus: false,
  })

  if (query.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="text-gray-400 text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          请输入搜索关键词
        </h3>
        <p className="text-gray-600">
          在上方搜索框中输入要查找的新闻标题、摘要或内容
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div
              key={index}
              className="h-40 rounded-xl border border-gray-200 bg-white p-4 animate-pulse"
            >
              <div className="h-6 w-3/4 bg-gray-200 rounded mb-3"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded"></div>
                <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="text-red-500 text-6xl mb-4">
          <AlertCircle size={64} />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          搜索失败
        </h3>
        <p className="text-gray-600 mb-6">
          {(error as any)?.message || '搜索时出现错误，请稍后重试'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="text-gray-400 text-6xl mb-4">📭</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          未找到结果
        </h3>
        <p className="text-gray-600">
          没有找到与 "{query}" 相关的新闻
        </p>
      </div>
    )
  }

  const { data: news, pagination } = data

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Search Info */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          搜索结果
        </h2>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            关键词: <span className="font-medium text-gray-900">"{data.query}"</span>
          </span>
          <span>·</span>
          <span>共 {pagination.total} 条结果</span>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {news.map((item) => (
          <NewsCard
            key={item.id}
            id={item.id}
            title={item.title}
            summary={item.summary}
            author={item.author}
            source={item.source}
            publishedAt={item.publishedAt}
            imageUrl={item.imageUrl}
            category={item.category}
            tags={item.tags}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12 pt-6 border-t border-gray-200">
          <button
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set('page', String(page - 1))
              window.location.href = url.toString()
            }}
            disabled={!pagination.hasPrev}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            上一页
          </button>

          <span className="text-sm text-gray-600">
            第 {pagination.page} / {pagination.totalPages} 页
          </span>

          <button
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set('page', String(page + 1))
              window.location.href = url.toString()
            }}
            disabled={!pagination.hasNext}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
