import api from './api'

// API 返回的收藏数据就是新闻对象本身
export interface Favorite {
  id: number
  title: string
  summary: string
  content?: string
  author?: string
  url: string
  imageUrl: string | null
  category?: string
  tags?: string[]
  publishedAt?: string
  source?: {
    id: number
    name: string
    type: string
    category?: string
  }
  favoritedAt: string
  viewCount?: number
  likeCount?: number
  shareCount?: number
}

export interface FavoritesResponse {
  data: Favorite[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext?: boolean
    hasPrev?: boolean
  }
}

/**
 * Get user's favorite news list
 */
export async function getFavorites(page = 1, limit = 20): Promise<FavoritesResponse> {
  const response = await api.get<FavoritesResponse>('/api/users/favorites', {
    params: { page, limit },
  })
  return response.data
}

/**
 * Add a news to favorites
 */
export async function addFavorite(newsId: number): Promise<{ success: boolean; data: Favorite }> {
  const response = await api.post(`/api/users/favorites/${newsId}`)
  return response.data
}

/**
 * Remove a news from favorites
 */
export async function removeFavorite(newsId: number): Promise<{ success: boolean }> {
  const response = await api.delete(`/api/users/favorites/${newsId}`)
  return response.data
}

/**
 * Check if a news is in user's favorites
 */
export async function checkFavorite(newsId: number): Promise<{ isFavorite: boolean }> {
  try {
    const response = await api.get(`/api/users/favorites/check/${newsId}`)
    return response.data
  } catch {
    return { isFavorite: false }
  }
}
