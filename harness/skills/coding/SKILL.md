# skill-nextjs-coding

## 適用対象

- Next.js / TypeScript 実装全般
- 主に `web/src/app`, `web/src/components`, `web/src/game`, `web/src/lib`

## 実行手順

1. 要求を機能単位に分解する
2. 影響範囲を明示し、対象外を宣言する
3. 最小差分で実装する
4. `npm run lint` と `npm run type-check` を実行する
5. 必要時のみ `npm run build` を実行する

## コーディング規約

- 可能な限り `@/` エイリアス import を使う
- TypeScript strict 前提で型安全を優先
- コンポーネントは PascalCase、ユーティリティは camelCase
- Phaser シーン名は `*Scene` サフィックス

## 禁止事項

- 無関係なコード整形・リネーム
- 生成物ディレクトリの手動編集
