import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI News Hub',
  description: 'AI-powered news aggregation platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
