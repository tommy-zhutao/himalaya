/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // 在 Docker 内部使用 api-gateway，外部访问时通过相对路径代理
    const apiDestination = process.env.NEXT_PUBLIC_API_URL || 'http://api-gateway:4000'
    return [
      {
        source: '/api/:path*',
        destination: `${apiDestination}/api/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
