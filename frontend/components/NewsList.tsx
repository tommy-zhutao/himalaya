import { useQuery } from '@tanstack/react-query'
import NewsCard from './NewsCard'
import { getNews, NewsListResponse } from '@/lib/news'

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
  // AI 分析字段
  aiSummary?: string | null
  keywords?: string[]
  sentiment?: 'positive' | 'negative' | 'neutral' | null
  qualityScore?: number | null
}

interface NewsListProps {
  category?: string
  sourceId?: number
  sort?: 'latest' | 'hot'
  refreshKey?: number // 添加 refreshKey prop
}

export default function NewsList({ category, sourceId, sort = 'latest', refreshKey }: NewsListProps) {
  // Fetch news - 把 refreshKey 加入 queryKey，这样刷新时会重新请求
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<NewsListResponse>({
    queryKey: ['news', category, sourceId, sort, refreshKey],
    queryFn: () => getNews({ page: 1, limit: 20, category, sourceId, sort }),
    refetchOnWindowFocus: false,
  })

  if (isLoading) {
    return (
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
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          加载失败
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {(error as any)?.message || '无法加载新闻列表，请稍后重试'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          重试
        </button>
      </div>
    )
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-gray-400 text-6xl mb-4">📭</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          暂无新闻
        </h3>
        <p className="text-sm text-gray-600">
          当前没有可显示的新闻内容
        </p>
      </div>
    )
  }

  const { data: news, pagination } = data

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          {sort === 'hot' ? '热门新闻' : (category || '最新新闻')}
        </h2>
        <span className="text-sm text-gray-600">
          共 {pagination.total} 条新闻
        </span>
      </div>

      {/* News List */}
      <div className="space-y-4">
        {news.map((item) => (
          <NewsCard
            key={item.id}
            id={item.id}
            title={item.title}
            summary={item.summary || ''}
            author={item.author || 'Unknown'}
            source={item.source}
            publishedAt={item.publishedAt}
            imageUrl={item.imageUrl}
            category={item.category}
            tags={item.tags}
            keywords={item.keywords}
            sentiment={item.sentiment}
            qualityScore={item.qualityScore}
          />
        ))}
      </div>

      {/* Pagination Info */}
      <div className="flex items-center justify-center pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>
            第 {pagination.page} / {pagination.totalPages} 页
          </span>
          <span>·</span>
          <span>每页 {pagination.limit} 条</span>
        </div>
      </div>
    </div>
  )
}
