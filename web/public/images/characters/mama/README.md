# ママ（ドットキャラ）画像配置ガイド

- 基本ファイル: `mama-sprite.png`（6フレーム想定、スプライトシート）
- 参照パス: `/images/characters/mama/mama-sprite.png`

推奨レイアウト（例）
- 横1列 × 6フレーム（同一サイズ・余白なし）
- 1フレームの幅・高さは同一（例: 64x64, 96x96 など）

命名規則（分割する場合）
- 立ち: `mama-standing.png`
- 歩き1: `mama-walk-01.png`
- 歩き2: `mama-walk-02.png`
- 喜ぶ: `mama-happy.png`
- 指差し: `mama-point.png`
- 手招き: `mama-call.png`

最適化の推奨
- 透過が必要: `png`
- 容量削減: `webp`（例: `mama-sprite.webp` を併用）

実装時のヒント（Next.js）
- `<div>` 背景にスプライトを当て、`steps(6)` のCSSアニメーションでコマ送り。
- もしくは `<Image>` で個別フレーム画像（分割版）を表示する。
