import Link from 'next/link'
import { ArrowLeft, Newspaper, Zap, Shield, Users } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-6">
          <ArrowLeft size={18} />
          返回首页
        </Link>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">📰</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">关于 AI News Hub</h1>
            <p className="text-gray-600">智能新闻聚合平台，为您精选全球资讯</p>
          </div>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">平台简介</h2>
              <p className="text-gray-700 leading-relaxed">
                AI News Hub 是一个基于微服务架构的智能新闻聚合平台，整合了全球多个新闻源的 RSS 订阅和 API 接口，为用户提供实时、全面的新闻资讯。平台采用先进的抓取技术和智能推荐算法，确保您第一时间获取最相关、最有价值的新闻内容。
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">核心功能</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Newspaper className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">多新闻源订阅</h3>
                    <p className="text-sm text-gray-600">支持 RSS 和 API 多种数据源</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Zap className="text-yellow-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">实时更新</h3>
                    <p className="text-sm text-gray-600">自动定时抓取，内容实时同步</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Shield className="text-green-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">安全可靠</h3>
                    <p className="text-sm text-gray-600">用户数据加密，隐私保护</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                  <Users className="text-purple-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">个性化服务</h3>
                    <p className="text-sm text-gray-600">收藏管理，智能推荐</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">技术架构</h2>
              <p className="text-gray-700 leading-relaxed">
                平台采用现代化的微服务架构，前端基于 Next.js 14 构建，使用 TypeScript 和 Tailwind CSS 确保代码质量和开发效率。后端采用 Express.js 框架，通过 Docker 容器化部署，支持高可用和水平扩展。数据存储采用 PostgreSQL 和 Redis，保证数据持久化和查询性能。
              </p>
            </section>

            <section className="p-6 bg-blue-50 rounded-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-2">联系我们</h2>
              <p className="text-gray-700">
                如有任何问题或建议，欢迎通过反馈渠道联系我们。感谢您的使用！
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>© 2026 AI News Hub. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
