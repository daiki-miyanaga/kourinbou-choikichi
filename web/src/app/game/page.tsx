"use client"
import { useEffect, useRef, useState } from 'react'
import { asset } from '@/lib/assets'

export default function GamePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [log, setLog] = useState<string[]>([])
  const push = (m: string) => setLog((L) => [...L, m])
  useEffect(() => {
    if (!containerRef.current) return
    const parent = containerRef.current

    let game: any
    const onError = (e: any) => {
      const msg = e?.reason?.message || e?.message || String(e)
      push(`Error: ${msg}`)
    }
    window.addEventListener('unhandledrejection', onError)
    window.addEventListener('error', onError as any)
    ;(async () => {
      try {
        push('loading phaser...')
        const PhaserMod = await import('phaser')
        push('loading scene...')
        const { default: MainScene } = await import('@/game/scenes/MainScene')
        const AUTO = (PhaserMod as any).AUTO
        const Scale = (PhaserMod as any).Scale
        push('creating game...')
        game = new (PhaserMod as any).Game({
          type: AUTO,
          parent,
          width: 420,
          height: 480,
          backgroundColor: '#0b0f19',
          pixelArt: true,
          scene: [MainScene],
          scale: { mode: Scale.FIT, autoCenter: Scale.CENTER_BOTH },
        })
        push('game created')
      } catch (err: any) {
        push(`init failed: ${err?.message || String(err)}`)
      }
    })()

    return () => {
      window.removeEventListener('unhandledrejection', onError)
      window.removeEventListener('error', onError as any)
      if (game) game.destroy(true)
    }
  }, [])

  return (
    <main style={{ padding: 24 }}>
      <h1>Game</h1>
      <p>6×6 マッチ3 のプロトタイプ（タップで隣と入替）</p>
      <div ref={containerRef} style={{ width: 420, height: 480, border: '1px solid #333' }} />
      {/* ママはゲーム枠外に表示 */}
      <img
        src={asset('/images/characters/mama/mama-left.png')}
        alt="ママ"
        style={{ display: 'block', marginTop: 8, height: 120 }}
      />
      {log.length > 0 && (
        <pre style={{ marginTop: 16, background: '#111', color: '#0f0', padding: 12, fontSize: 12, maxWidth: 420, whiteSpace: 'pre-wrap' }}>
          {log.join('\n')}
        </pre>
      )}
    </main>
  )
}
