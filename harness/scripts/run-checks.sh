#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WEB_DIR="${ROOT_DIR}/web"

cd "${WEB_DIR}"

echo "[harness] running lint"
npm run lint

echo "[harness] running type-check"
npm run type-check

echo "[harness] checks completed"
