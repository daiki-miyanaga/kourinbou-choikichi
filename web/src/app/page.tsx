import Link from 'next/link'
import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>ちょい吉パズル</h1>
        <p className={styles.subtitle}>金沢市の立ち呑み処「ちょい吉」のマッチ3パズル</p>
        <Link href="/game" className={styles.startButton}>
          ゲームスタート！
        </Link>
      </div>

      <section className={styles.helpCard} aria-label="遊び方">
        <h2 className={styles.helpTitle}>遊び方</h2>
        <ul className={styles.helpList}>
          <li>隣り合うおつまみを入れ替えて3つ以上そろえる</li>
          <li>60秒でできるだけ高得点を目指す</li>
          <li>5個以上そろえるとボーナス＆フィーバー加速</li>
        </ul>
      </section>
    </main>
  )
}
