# AI Agent Harness

このディレクトリは、AIエージェントがこのリポジトリで安全かつ再現可能に作業するためのハーネス定義を管理します。

## 目的

- タスク実行時のポリシーと品質ゲートを統一する
- スキルを再利用可能な手順として管理する
- 計画・実装・レビューのプロンプトテンプレートを共通化する
- 実行ログの書式を揃え、PR作成時に説明コストを下げる

## 構成

- `config/`: 実行ポリシー、品質ゲート、タスクプロファイル
- `skills/`: コーディング・調査・QA・リリース向けの運用スキル
- `prompts/`: planner / implementer / reviewer のテンプレート
- `scripts/`: 将来の実行エントリ（現時点では雛形）
- `reports/templates/`: 計画書・実行レポートのテンプレート

## 運用フロー

1. `prompts/planner.md` で作業計画を提示
2. 計画承認後に `config/task-profiles.yaml` に従って作業
3. 実装後に `scripts/run-checks.sh` で品質ゲートを実行
4. `reports/templates/run-report.md` を埋めてPR説明へ転記

## 将来拡張

- CI から `scripts/run-checks.sh` を呼び出して結果を共通化
- スキルごとの入力バリデーション追加
- スナップショットQA（Playwright）を `qa` スキルへ統合
