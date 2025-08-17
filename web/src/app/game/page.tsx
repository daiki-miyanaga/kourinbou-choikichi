"use client"
import { useEffect, useRef } from 'react'

export default function GamePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!containerRef.current) return
    const parent = containerRef.current

    let game: any
    ;(async () => {
      const PhaserMod = await import('phaser')
      const { default: MainScene } = await import('@/game/scenes/MainScene')
      const AUTO = (PhaserMod as any).AUTO
      const Scale = (PhaserMod as any).Scale
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
    })()

    return () => {
      if (game) game.destroy(true)
    }
  }, [])

  return (
    <main style={{ padding: 24 }}>
      <h1>Game</h1>
      <p>6×6 マッチ3 のプロトタイプ（タップで隣と入替）</p>
      <div ref={containerRef} style={{ width: 420, height: 480, border: '1px solid #333' }} />
    </main>
  )
}
