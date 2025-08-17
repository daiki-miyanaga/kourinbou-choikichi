import Mama from '@/components/Mama'
import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Katamachi Choikichi</h1>
      <p>Next.js + TypeScript 雛形</p>
      <section style={{ marginTop: 24 }}>
        <h2 style={{ margin: '0 0 8px' }}>ママ（デモ）</h2>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {/* アニメーション（6fps, 2倍スケール） */}
          <Mama />
          {/* 静止フレーム例（3コマ目を表示） */}
          <Mama frame={2} playing={false} />
        </div>
        <div style={{ marginTop: 24 }}>
          <Link href="/game" style={{
            display: 'inline-block', padding: '10px 16px', background: '#06d6a0',
            color: '#0b0f19', borderRadius: 6, textDecoration: 'none', fontWeight: 700
          }}>
            ゲームをプレイする →
          </Link>
        </div>
      </section>
    </main>
  )
}
