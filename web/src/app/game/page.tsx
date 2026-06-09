'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import Mama from '@/components/Mama'
import MasakiPopup from '@/components/MasakiPopup'
import styles from './page.module.css'

type InitState = 'loading' | 'ready' | 'error'

export default function GamePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [log, setLog] = useState<string[]>([])
  const [initState, setInitState] = useState<InitState>('loading')

  const push = (m: string) => setLog((L) => [...L, m])

  useEffect(() => {
    if (!containerRef.current) return
    const parent = containerRef.current

    let game: import('phaser').Game | undefined
    const onError = (e: ErrorEvent | PromiseRejectionEvent) => {
      const msg = 'reason' in e ? String(e.reason?.message ?? e.reason) : e.message
      push(`Error: ${msg}`)
      setInitState('error')
    }

    window.addEventListener('unhandledrejection', onError)
    window.addEventListener('error', onError)

    ;(async () => {
      try {
        push('loading phaser...')
        const PhaserMod = await import('phaser')
        push('loading scene...')
        const { default: MainScene } = await import('@/game/scenes/MainScene')
        push('creating game...')
        const containerWidth = parent.clientWidth
        const containerHeight = parent.clientHeight
        game = new PhaserMod.Game({
          type: PhaserMod.AUTO,
          parent,
          width: Math.min(containerWidth, 420),
          height: Math.min(containerHeight, 480),
          backgroundColor: '#0b0f19',
          pixelArt: true,
          scene: [MainScene],
          scale: {
            mode: PhaserMod.Scale.FIT,
            autoCenter: PhaserMod.Scale.CENTER_BOTH,
            width: 420,
            height: 480,
          },
        })
        push('game created')
        setInitState('ready')
      } catch (err) {
        push(`init failed: ${err instanceof Error ? err.message : String(err)}`)
        setInitState('error')
      }
    })()

    return () => {
      window.removeEventListener('unhandledrejection', onError)
      window.removeEventListener('error', onError)
      if (game) game.destroy(true)
    }
  }, [])

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>🍻 ちょい吉パズル 🍻</h1>
      <p className={styles.description}>スワイプでおつまみを入れ替えて、60秒で高得点を狙おう！</p>

      <div ref={containerRef} className={styles.gameFrame}>
        {initState !== 'ready' && (
          <div className={styles.statusOverlay}>
            {initState === 'loading'
              ? 'ゲームを準備中です…\n少しお待ちください。'
              : '初期化に失敗しました。\n再読み込みをお試しください。'}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.reloadButton} onClick={() => window.location.reload()}>
          再読み込み
        </button>
        <Link href="/" className={styles.linkButton}>
          タイトルへ戻る
        </Link>
      </div>

      <Mama />
      <MasakiPopup />

      {initState === 'error' && log.length > 0 && <pre className={styles.debug}>{log.join('\n')}</pre>}
    </main>
  )
}
