'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/authStore'
import { getFavorites, removeFavorite, Favorite } from '@/lib/favorites'
import { useRouter } from 'next/navigation'
import { Trash2, Heart, Loader2, ArrowLeft } from 'lucide-react'

export default function FavoritesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuthStore()
  const [page, setPage] = useState(1)

  // Check authentication
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="mx-auto text-gray-300 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">请先登录</h2>
          <p className="text-gray-600 mb-6">登录后即可查看您的收藏列表</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">登录</Link>
            <Link href="/register" className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">注册</Link>
          </div>
        </div>
      </div>
    )
  }

  // Fetch favorites
  const { data: favoritesData, isLoading, isError, error } = useQuery({
    queryKey: ['favorites', page],
    queryFn: () => getFavorites(page, 20),
    refetchOnWindowFocus: false,
  })

  const removeMutation = useMutation({
    mutationFn: (newsId: number) => removeFavorite(newsId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })

  const handleRemoveFavorite = (newsId: number) => {
    if (confirm('确定要取消收藏这条新闻吗？')) removeMutation.mutate(newsId)
  }

  if (isLoading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Loader2 className="animate-spin text-blue-600 mx-auto" size={48} />
        <p className="text-center text-gray-600 mt-4">加载中...</p>
      </div>
    </div>
  )

  if (isError) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
          <p className="text-sm text-gray-600 mb-4">{(error as any)?.message || '无法加载收藏列表，请稍后重试'}</p>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
            <ArrowLeft size={16} />返回首页
          </button>
        </div>
      </div>
    </div>
  )

  const favorites = favoritesData?.data || []
  const pagination = favoritesData?.pagination

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-4">
            <ArrowLeft size={18} />返回首页
          </Link>
          <div className="flex items-center gap-3">
            <Heart className="text-red-500" size={32} fill="currentColor" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">我的收藏</h1>
              <p className="text-gray-600">共 {pagination?.total || 0} 条收藏</p>
            </div>
          </div>
        </div>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="text-gray-300 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无收藏</h3>
            <p className="text-gray-600 mb-6">您还没有收藏任何新闻，快去发现感兴趣的内容吧</p>
            <Link href="/" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">浏览新闻</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((favorite: Favorite) => (
              <div key={favorite.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-lg transition-all">
                <div className="flex gap-4">
                  {favorite.news.imageUrl && (
                    <div className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-gray-100">
                      <img src={favorite.news.imageUrl} alt={favorite.news.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link href={`/news/${favorite.news.id}`} className="block">
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 mb-2">{favorite.news.title}</h3>
                      {favorite.news.summary && <p className="text-sm text-gray-600 line-clamp-2 mb-2">{favorite.news.summary}</p>}
                    </Link>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {favorite.news.source && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{favorite.news.source.name}</span>}
                        {favorite.news.publishedAt && <span>收藏于 {new Date(favorite.createdAt).toLocaleDateString('zh-CN')}</span>}
                      </div>
                      <button onClick={() => handleRemoveFavorite(favorite.news.id)} disabled={removeMutation.isPending} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="取消收藏">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-gray-200">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">上一页</button>
            <span className="px-4 py-2 text-sm text-gray-600">第 {page} / {pagination.totalPages} 页</span>
            <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">下一页</button>
          </div>
        )}
      </div>
    </div>
  )
}
