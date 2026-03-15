'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useAuthStore } from '@/lib/stores/authStore'
import { getFavorites, removeFavorite, Favorite } from '@/lib/favorites'
import { useRouter } from 'next/navigation'
import { Trash2, Heart, Loader2, ArrowLeft } from 'lucide-react'

export default function FavoritesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isAuthenticated, checkAuth } = useAuthStore()
  const [page, setPage] = useState(1)
  const [authChecked, setAuthChecked] = useState(false)

  // 等待客户端挂载并检查认证状态
  useEffect(() => {
    checkAuth()
    // 给一点时间让状态更新
    const timer = setTimeout(() => {
      setAuthChecked(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [checkAuth])

  // 只有在认证检查完成且已登录时才获取数据
  const { data: favoritesData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['favorites', page],
    queryFn: () => getFavorites(page, 20),
    refetchOnWindowFocus: false,
    enabled: authChecked && isAuthenticated, // 只有在认证后才启用查询
  })

  const removeMutation = useMutation({
    mutationFn: (newsId: number) => removeFavorite(newsId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  })

  const handleRemoveFavorite = (newsId: number) => {
    if (confirm('确定要取消收藏这条新闻吗？')) removeMutation.mutate(newsId)
  }

  // 加载中
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    )
  }

  // 未登录
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

  // 获取数据中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Loader2 className="animate-spin text-blue-600 mx-auto" size={48} />
          <p className="text-center text-gray-600 mt-4">加载中...</p>
        </div>
      </div>
    )
  }

  // 获取失败
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">加载失败</h3>
            <p className="text-sm text-gray-600 mb-4">{(error as any)?.message || '无法加载收藏列表，请稍后重试'}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => refetch()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                重试
              </button>
              <button onClick={() => router.push('/')} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
                <ArrowLeft size={16} />返回首页
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const favorites = favoritesData?.data || []
  const pagination = favoritesData?.pagination

  return (
    <div className="min-h-screen bg-gray-50">
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
            {favorites.map((favorite) => (
              <div key={favorite.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-lg transition-all">
                <div className="flex gap-4">
                  {favorite.imageUrl && (
                    <div className="flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-gray-100">
                      <img src={favorite.imageUrl} alt={favorite.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Link href={`/news/${favorite.id}`} className="block">
                      <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 mb-2">{favorite.title}</h3>
                      {favorite.summary && <p className="text-sm text-gray-600 line-clamp-2 mb-2">{favorite.summary}</p>}
                    </Link>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {favorite.source && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{favorite.source.name}</span>}
                        {favorite.favoritedAt && <span>收藏于 {new Date(favorite.favoritedAt).toLocaleDateString('zh-CN')}</span>}
                      </div>
                      <button onClick={() => handleRemoveFavorite(favorite.id)} disabled={removeMutation.isPending} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="取消收藏">
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
