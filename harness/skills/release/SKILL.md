# skill-release-check

## 目的

GitHub Pages 含む公開前の破綻を防ぐ。

## 手順

1. 必須ゲート（lint/type-check）を通す
2. 必要に応じて `NEXT_PUBLIC_BASE_PATH` を設定して build する
3. 静的アセット参照とルーティングを確認する
4. PR本文へ実行コマンドと結果を添付する

## チェック項目

- basePath の想定値
- 画像/音声アセットの配信パス
- 404 / 直リンクアクセスの挙動
