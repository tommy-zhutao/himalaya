'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

interface Stats {
  totalNews: number
  totalSources: number
  totalUsers: number
  todayNews: number
}

interface RecentNews {
  id: number
  title: string
  source: { name: string }
  publishedAt: string
  viewCount: number
}

interface FetchLog {
  id: number
  status: string
  itemsFetched: number
  itemsCreated: number
  startedAt: string
  sourceId: number | null
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentNews, setRecentNews] = useState<RecentNews[]>([])
  const [fetchLogs, setFetchLogs] = useState<FetchLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const headers = { Authorization: `Bearer ${token}` }

      // Fetch stats
      const statsRes = await fetch(`${API_URL}/api/admin/stats`, { headers })
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.data)
      }

      // Fetch recent news
      const newsRes = await fetch(`${API_URL}/api/admin/news?limit=5`, { headers })
      if (newsRes.ok) {
        const newsData = await newsRes.json()
        setRecentNews(newsData.data)
      }

      // Fetch fetch logs
      const logsRes = await fetch(`${API_URL}/api/admin/logs?limit=5`, { headers })
      if (logsRes.ok) {
        const logsData = await logsRes.json()
        setFetchLogs(logsData.data)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">仪表盘</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">📰</div>
          <div className="text-2xl font-bold text-gray-800">{stats?.totalNews || 0}</div>
          <div className="text-sm text-gray-500">总新闻数</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">📡</div>
          <div className="text-2xl font-bold text-gray-800">{stats?.totalSources || 0}</div>
          <div className="text-sm text-gray-500">新闻源</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-2xl font-bold text-gray-800">{stats?.totalUsers || 0}</div>
          <div className="text-sm text-gray-500">注册用户</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl mb-2">📅</div>
          <div className="text-2xl font-bold text-gray-800">{stats?.todayNews || 0}</div>
          <div className="text-sm text-gray-500">今日新增</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent News */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">最新新闻</h3>
            <Link href="/admin/news" className="text-sm text-blue-600 hover:text-blue-800">
              查看全部
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentNews.map((news) => (
              <div key={news.id} className="px-6 py-3 hover:bg-gray-50">
                <div className="text-sm font-medium text-gray-800 truncate">
                  {news.title}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {news.source?.name || '未知来源'} · {new Date(news.publishedAt).toLocaleDateString('zh-CN')} · {news.viewCount} 次浏览
                </div>
              </div>
            ))}
            {recentNews.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">暂无数据</div>
            )}
          </div>
        </div>

        {/* Fetch Logs */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">抓取日志</h3>
            <Link href="/admin/logs" className="text-sm text-blue-600 hover:text-blue-800">
              查看全部
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {fetchLogs.map((log) => (
              <div key={log.id} className="px-6 py-3 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      log.status === 'success'
                        ? 'bg-green-100 text-green-700'
                        : log.status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {log.status === 'success' ? '成功' : log.status === 'error' ? '失败' : '部分成功'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(log.startedAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  抓取: {log.itemsFetched} · 新增: {log.itemsCreated}
                </div>
              </div>
            ))}
            {fetchLogs.length === 0 && (
              <div className="px-6 py-8 text-center text-gray-500">暂无数据</div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-800 mb-4">快捷操作</h3>
        <div className="flex gap-4">
          <Link
            href="/admin/sources?action=create"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + 添加新闻源
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            查看前台
          </Link>
        </div>
      </div>
    </div>
  )
}
