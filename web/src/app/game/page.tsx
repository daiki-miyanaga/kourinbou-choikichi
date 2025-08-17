"use client"
import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import MainScene from '@/game/scenes/MainScene'

export default function GamePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!containerRef.current) return
    const parent = containerRef.current

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: 420,
      height: 480,
      backgroundColor: '#0b0f19',
      pixelArt: true,
      scene: [MainScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    })

    return () => {
      game.destroy(true)
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

