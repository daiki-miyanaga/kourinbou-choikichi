'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { asset } from '@/lib/assets'
import styles from './page.module.css'

const items = [
  { src: '/images/items/gyuusuji.png', label: '牛すじ' },
  { src: '/images/items/edamame.png', label: '枝豆' },
  { src: '/images/items/potatosalad.png', label: 'ポテサラ' },
  { src: '/images/items/sausage.png', label: 'ソーセージ' },
]

export default function Home() {
  const [best, setBest] = useState<number | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('choikichi-best-score')
      if (raw) setBest(Math.max(0, Number(raw)))
    } catch {
      // noop
    }
  }, [])

  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <p className={styles.lantern}>🏮 金沢・香林坊の立ち呑み処 🏮</p>
        <h1 className={styles.title}>ちょい吉パズル</h1>
        <p className={styles.subtitle}>おつまみを揃えて、お店を盛り上げよう！</p>

        <div className={styles.itemsRow} aria-hidden="true">
          {items.map((item, i) => (
            <div key={item.label} className={styles.itemCard} style={{ animationDelay: `${i * 0.4}s` }}>
              <Image src={asset(item.src)} alt={item.label} width={56} height={56} unoptimized />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <Link href="/game" className={styles.startButton}>
          🍻 ゲームスタート！
        </Link>

        {best !== null && best > 0 && (
          <p className={styles.bestChip}>🏆 自己ベスト {best.toLocaleString()} 点</p>
        )}
      </div>

      <section className={styles.helpCard} aria-label="遊び方">
        <h2 className={styles.helpTitle}>あそびかた</h2>
        <ul className={styles.helpList}>
          <li>🍢 おつまみをスワイプ（またはタップで選んで隣をタップ）して入れ替え</li>
          <li>⏰ 60秒でできるだけ高得点を目指そう</li>
          <li>💥 5個以上そろえると「金箔ビール爆弾」が登場！タップで周りごとドカン</li>
          <li>🔥 ゲージがたまると10秒間スコア2倍のフィーバータイム</li>
          <li>🔁 連鎖（コンボ）でスコア倍率がどんどんアップ（最大×5）</li>
        </ul>
      </section>
    </main>
  )
}
