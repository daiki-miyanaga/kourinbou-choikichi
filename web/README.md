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
