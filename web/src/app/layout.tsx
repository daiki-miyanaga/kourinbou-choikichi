import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Katamachi Choikichi',
  description: '回遊体験アプリ（仮）',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

