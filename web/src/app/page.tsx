import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ 
      padding: '16px', 
      textAlign: 'center',
      background: 'linear-gradient(to bottom, #1a1a2e, #16213e)',
      color: '#fff',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ 
        fontSize: 'clamp(1.8rem, 8vw, 2.5rem)', 
        marginBottom: '1rem',
        color: '#f4a261',
        lineHeight: 1.2
      }}>ちょい吉パズル</h1>
      <p style={{ 
        fontSize: 'clamp(1rem, 4vw, 1.2rem)', 
        marginBottom: '2rem',
        color: '#e9c46a',
        maxWidth: '90vw',
        lineHeight: 1.4
      }}>金沢市の立ち呑み処「ちょい吉」のマッチ3パズル</p>
      
      <div style={{ marginTop: '24px' }}>
        <Link href="/game" style={{
          display: 'inline-block', 
          padding: '16px 32px', 
          background: '#e76f51',
          color: '#fff', 
          borderRadius: '8px', 
          textDecoration: 'none', 
          fontWeight: 700,
          fontSize: 'clamp(1rem, 4vw, 1.2rem)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          transition: 'transform 0.2s',
          minWidth: '200px',
          textAlign: 'center'
        }}>
          ゲームスタート！
        </Link>
      </div>
    </main>
  )
}
