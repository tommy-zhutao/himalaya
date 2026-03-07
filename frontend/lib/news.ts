import api from './api'

export interface News {
  id: number
  sourceId?: number
  title: string
  summary?: string
  content?: string
  author?: string
  url: string
  imageUrl?: string
  category?: string
  tags: string[]
  publishedAt?: string
  fetchedAt: string
  createdAt: string
  updatedAt: string
  viewCount: number
  likeCount: number
  shareCount: number
  source?: {
    id: number
    name: string
    type: string
  }
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface NewsListResponse {
  data: News[]
  pagination: Pagination
}

export interface NewsResponse {
  data: News
}

export interface SearchResponse {
  query: string
  data: News[]
  pagination: Pagination
}

// Get news list
export async function getNews(params?: {
  page?: number
  limit?: number
  category?: string
  sourceId?: number
  sort?: 'latest' | 'hot'
}): Promise<NewsListResponse> {
  const response = await api.get<NewsListResponse>('/api/news', { params })
  return response.data
}

// Get news detail
export async function getNewsById(id: number): Promise<NewsResponse> {
  const response = await api.get<NewsResponse>(`/api/news/${id}`)
  return response.data
}

// Search news
export async function searchNews(params: {
  q: string
  page?: number
  limit?: number
  category?: string
}): Promise<SearchResponse> {
  const response = await api.get<SearchResponse>('/api/news/search', { params })
  return response.data
}

// Get hot news
export async function getHotNews(params?: {
  limit?: number
  days?: number
}): Promise<{ data: News[] }> {
  const response = await api.get<{ data: News[] }>('/api/news/hot', { params })
  return response.data
}

// Get related news
export async function getRelatedNews(id: number, limit?: number): Promise<{ data: News[] }> {
  const response = await api.get<{ data: News[] }>(`/api/news/related/${id}`, { params: { limit } })
  return response.data
}
