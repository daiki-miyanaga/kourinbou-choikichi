# Harness Skills - Common Spec

## 目的

スキルは、AIエージェントが同じ品質で作業するための手順テンプレートです。

## 共通ルール

1. まずタスクを `planning-only / feature / bugfix / investigation` に分類する
2. 変更は最小差分で行い、無関係なリファクタを避ける
3. `web/.next`, `web/out`, `docs/_next` を手動編集しない
4. 必須品質ゲート（lint/type-check）は成功させる
5. 実行コマンドと結果を必ず記録する

## スキル構成

- `coding/`: 実装時の規約
- `debugging/`: 不具合調査と切り分け
- `qa/`: 手動確認と観点整理
- `release/`: build/export前の確認
