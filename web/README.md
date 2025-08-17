# Web (Next.js + TypeScript)

手動で作成した Next.js 雛形です。依存関係をインストールして起動してください。

## セットアップ

```bash
cd web
npm install
# Phaser を使うため依存が追加されています
npm install phaser
npm run dev
```

## スクリプト
- `npm run dev`: 開発サーバ起動 (http://localhost:3000)
- `npm run build`: 本番ビルド
- `npm run start`: 本番サーバ起動
- `npm run lint`: ESLint 実行
- `npm run type-check`: 型チェック

## ルーティング
- トップ: `/`（ママの表示デモ）
- ゲーム: `/game`（6×6 マッチ3 プロトタイプ、タップ/ドラッグで隣と入替）
  - 60秒タイマー、スコア計算（基本100/個、4個消し+500）
  - 連鎖ごとにコンボ倍率（×1 → ×1.2 → ×1.5 → ×2 → ×3 → ×5）
  - タイムアップでリザルト＋コメント表示、[Restart] で再開
  - アイテム画像: `/public/images/items/`（`gyusuji.svg`, `edamame.svg`, `potatosalad.svg`, `sausage.svg`）
  - 実画像に差し替え済み: `gyuusuji.png`, `edamame.png`, `potatosalad.png`, `sausage.png`
  - 背景: `/public/images/backgrounds/choikichi.jpg`
  - ママ: `/public/images/characters/mama/mama-left.png` を盤面下に表示
