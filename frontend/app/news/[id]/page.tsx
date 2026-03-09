'use client'

import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import NewsDetail from '@/components/NewsDetail'
import { Loader2, AlertCircle } from 'lucide-react'

interface NewsResponse {
  data: {
    id: number
    title: string
    summary: string
    content: string
    author: string
    publishedAt?: string
    imageUrl?: string | null
    category?: string | null
    tags?: string[]
    viewCount?: number
    likeCount?: number
    shareCount?: number
    source?: {
      id: number
      name: string
      type: string
      url?: string
    }
  }
}

interface RelatedNewsResponse {
  data: {
    id: number
    title: string
    summary: string
    publishedAt?: string
    imageUrl?: string | null
    category?: string | null
    source?: {
      id: number
      name: string
      type: string
    }
  }[]
}

export default function NewsDetailPage({ params }: { params: { id: string } }) {
  const newsId = parseInt(params.id)

  // Fetch news detail
  const {
    data: newsData,
    isLoading: newsLoading,
    isError: newsError,
  } = useQuery<NewsResponse>({
    queryKey: ['news-detail', newsId],
    queryFn: async () => {
      const response = await axios.get(`/api/news/${newsId}`)
      return response.data
    },
    refetchOnWindowFocus: false,
  })

  // Fetch related news
  const {
    data: relatedNews,
    isLoading: relatedLoading,
  } = useQuery<RelatedNewsResponse>({
    queryKey: ['news-related', newsId],
    queryFn: async () => {
      const response = await axios.get(`/api/news/related/${newsId}?limit=5`)
      return response.data
    },
    refetchOnWindowFocus: false,
  })

  if (newsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
        <div className="maxmax-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <Loader2 size={48} className="text-blue-600 animate-spin" />
            <span className="ml-4 text-gray-600 text-lg">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (newsError || !newsData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-red-500 text-6xl mb-4">
              <AlertCircle size={64} />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-3">
              加载失败
            </h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {(newsError as any)?.message || '无法加载新闻详情，请稍后重试'}
            </p>
            <a
              href="/"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回首页
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <NewsDetail {...newsData.data} />
        
        {/* Related News Section */}
        {relatedNews?.data && relatedNews.data.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">相关新闻</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedNews.data.map((item) => (
                <a
                  key={item.id}
                  href={`/news/${item.id}`}
                  className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4"
                >
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {item.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{item.source?.name || '未知来源'}</span>
                    <span>
                      {item.publishedAt
                        ? new Date(item.publishedAt).toLocaleDateString('zh-CN')
                        : ''}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
