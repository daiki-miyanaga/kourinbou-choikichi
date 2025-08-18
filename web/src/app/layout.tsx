import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ちょい吉パズル',
  description: '金沢市の立ち呑み処「ちょい吉」のマッチ3パズル',
  viewport: 'width=device-width, initial-scale=1.0, user-scalable=no',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}

