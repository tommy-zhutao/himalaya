import Link from 'next/link'
import { ArrowLeft, Shield, Eye, Lock, Trash2 } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-6">
          <ArrowLeft size={18} />
          返回首页
        </Link>

        <div className="bg-white rounded-2xl shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">隐私政策</h1>
            <p className="text-gray-600">最后更新：2026年3月</p>
          </div>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield size={20} className="text-blue-600" />
                信息收集
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                AI News Hub 仅收集为您提供服务所必需的最少信息，包括：
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
                <li>注册时提供的邮箱地址和用户名</li>
                <li>用于登录的加密密码（我们只存储哈希值）</li>
                <li>您主动设置的偏好设置和收藏列表</li>
                <li>浏览行为匿名统计数据（用于改进服务）</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Eye size={20} className="text-green-600" />
                信息使用
              </h2>
              <p className="text-gray-700 leading-relaxed">
                我们使用收集的信息为您提供以下服务：
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-3">
                <li>用户身份验证和账户管理</li>
                <li>保存您的收藏和个人偏好</li>
                <li>改进网站功能和用户体验</li>
                <li>提供个性化新闻推荐</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock size={20} className="text-purple-600" />
                数据保护
              </h2>
              <p className="text-gray-700 leading-relaxed">
                我们采取多种安全措施保护您的个人信息：
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-3">
                <li>所有密码使用 bcrypt 算法加密存储</li>
                <li>敏感数据传输使用 HTTPS 加密</li>
                <li>定期进行安全审计和漏洞扫描</li>
                <li>严格限制员工对用户数据的访问权限</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Trash2 size={20} className="text-red-600" />
                用户权利
              </h2>
              <p className="text-gray-700 leading-relaxed">
                您对自己的数据拥有以下权利：
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mt-3">
                <li>查看我们收集的关于您的个人信息</li>
                <li>要求更新或更正不准确的信息</li>
                <li>要求删除您的账户和相关数据</li>
                <li>撤回对数据使用的同意</li>
              </ul>
            </section>

            <section className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Cookie 使用</h2>
              <p className="text-gray-700">
                我们使用 Cookie 和类似技术来记住您的登录状态和偏好设置。您可以通过浏览器设置禁用 Cookie，但这可能影响某些功能的使用。
              </p>
            </section>

            <section className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">联系我们</h2>
              <p className="text-gray-700">
                如对本隐私政策有任何疑问或行使您的数据权利，请通过反馈渠道联系我们。我们将在收到您的请求后尽快处理。
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
