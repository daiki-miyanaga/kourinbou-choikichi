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
        const containerWidth = parent.clientWidth
        const containerHeight = parent.clientHeight
        game = new (PhaserMod as any).Game({
          type: AUTO,
          parent,
          width: Math.min(containerWidth, 420),
          height: Math.min(containerHeight, 480),
          backgroundColor: '#0b0f19',
          pixelArt: true,
          scene: [MainScene],
          scale: { 
            mode: Scale.FIT, 
            autoCenter: Scale.CENTER_BOTH,
            width: 420,
            height: 480
          },
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
    <main style={{ 
      padding: '8px', 
      textAlign: 'center',
      background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
      color: '#fff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      paddingTop: '20px'
    }}>
      <h1 style={{ 
        fontSize: 'clamp(1.5rem, 6vw, 2rem)', 
        marginBottom: '0.5rem',
        color: '#f4a261',
        margin: '0 0 8px 0'
      }}>ちょい吉パズル</h1>
      <p style={{ 
        fontSize: 'clamp(0.8rem, 3vw, 1rem)', 
        marginBottom: '16px',
        color: '#e9c46a',
        margin: '0 0 16px 0'
      }}>60秒でおつまみを揃えてね！</p>
      <div 
        ref={containerRef} 
        style={{ 
          width: 'min(90vw, 420px)', 
          height: 'min(90vw * 480/420, 480px)', 
          maxWidth: '420px',
          maxHeight: '480px',
          border: '2px solid #e76f51',
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          margin: '0 auto'
        }} 
      />
      {/* ママはゲーム枠外に表示 */}
      <img
        src={asset('/images/characters/mama/mama-left.png')}
        alt="ママ"
        style={{ 
          display: 'block', 
          marginTop: '8px', 
          height: 'clamp(80px, 15vw, 120px)',
          maxWidth: '90vw',
          objectFit: 'contain'
        }}
      />
      {log.length > 0 && (
        <pre style={{ 
          marginTop: '16px', 
          background: '#111', 
          color: '#0f0', 
          padding: '12px', 
          fontSize: 'clamp(10px, 2.5vw, 12px)', 
          maxWidth: 'min(90vw, 420px)', 
          whiteSpace: 'pre-wrap',
          borderRadius: '4px',
          overflow: 'auto'
        }}>
          {log.join('\n')}
        </pre>
      )}
    </main>
  )
}
