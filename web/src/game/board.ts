export type Cell = number // 0=空, 1..types=ピース種類
export type Board = Cell[][] // [row][col]

export const ROWS = 6
export const COLS = 6
export const TYPES = 4
export const BOMB_VALUE = 99 // 爆弾アイテムの特殊値

const rand = (n: number) => Math.floor(Math.random() * n)

export type RunOrientation = 'row' | 'column'

export interface Run {
  orientation: RunOrientation
  index: number // orientation が row の場合は行index, column の場合は列index
  start: number // ランの開始位置（列または行）
  length: number
  value: Cell
}

export function scanRuns(b: Board, minLength = 3): Run[] {
  const runs: Run[] = []
  const rowCount = b.length
  if (rowCount === 0) return runs
  const colCount = b[0].length
  if (colCount === 0) return runs

  for (let r = 0; r < rowCount; r++) {
    let c = 0
    while (c < colCount) {
      const value = b[r][c]
      if (value === 0) {
        c++
        continue
      }
      let length = 1
      while (c + length < colCount && b[r][c + length] === value) {
        length++
      }
      if (length >= minLength) {
        runs.push({ orientation: 'row', index: r, start: c, length, value })
      }
      c += length
    }
  }

  for (let c = 0; c < colCount; c++) {
    let r = 0
    while (r < rowCount) {
      const value = b[r][c]
      if (value === 0) {
        r++
        continue
      }
      let length = 1
      while (r + length < rowCount && b[r + length][c] === value) {
        length++
      }
      if (length >= minLength) {
        runs.push({ orientation: 'column', index: c, start: r, length, value })
      }
      r += length
    }
  }

  return runs
}

export function createBoard(rows = ROWS, cols = COLS, types = TYPES): Board {
  const b: Board = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let v: Cell
      do {
        v = (rand(types) + 1) as Cell
      } while (
        (c >= 2 && b[r][c - 1] === v && b[r][c - 2] === v) ||
        (r >= 2 && b[r - 1][c] === v && b[r - 2][c] === v)
      )
      b[r][c] = v
    }
  }
  return b
}

export function inBounds(r: number, c: number, rows = ROWS, cols = COLS) {
  return r >= 0 && r < rows && c >= 0 && c < cols
}

export function swap(b: Board, r1: number, c1: number, r2: number, c2: number) {
  const tmp = b[r1][c1]
  b[r1][c1] = b[r2][c2]
  b[r2][c2] = tmp
}

export function findMatches(b: Board) {
  const matches = new Set<string>()
  for (const run of scanRuns(b)) {
    for (let offset = 0; offset < run.length; offset++) {
      const r = run.orientation === 'row' ? run.index : run.start + offset
      const c = run.orientation === 'row' ? run.start + offset : run.index
      matches.add(`${r},${c}`)
    }
  }
  return matches
}

// スコア算出用に、横/縦の「連続数」を収集（3以上のみ）
export function collectRuns(b: Board) {
  return scanRuns(b).map((run) => run.length)
}

export function scoreForRuns(runs: number[]) {
  // 改善されたスコアシステム
  let score = 0
  for (const n of runs) {
    score += 100 * n
    if (n === 4) score += 500
    if (n === 5) score += 1000
    if (n >= 6) score += 2000 // 6個以上の大連鎖
  }
  return score
}

export function clearMatches(b: Board, matches: Set<string>) {
  for (const key of matches) {
    const [r, c] = key.split(',').map(Number)
    b[r][c] = 0
  }
}

export function collapseAndRefill(b: Board, types = TYPES) {
  const rows = b.length
  const cols = b[0].length
  for (let c = 0; c < cols; c++) {
    let write = rows - 1
    for (let r = rows - 1; r >= 0; r--) {
      if (b[r][c] !== 0) {
        b[write][c] = b[r][c]
        if (write !== r) b[r][c] = 0
        write--
      }
    }
    for (let r = write; r >= 0; r--) {
      b[r][c] = (rand(types) + 1) as Cell
    }
  }
}

export function isAdjacent(r1: number, c1: number, r2: number, c2: number) {
  return (Math.abs(r1 - r2) + Math.abs(c1 - c2)) === 1
}

// 5個以上のランから爆弾生成位置を計算
export function getBombPositions(runs: Run[]) {
  const bombPositions: { r: number; c: number }[] = []

  for (const run of runs) {
    if (run.length < 5) continue
    const center = Math.floor(run.start + run.length / 2)
    if (run.orientation === 'row') {
      bombPositions.push({ r: run.index, c: center })
    } else {
      bombPositions.push({ r: center, c: run.index })
    }
  }

  return bombPositions
}

// 爆弾を盤面に生成
export function createBombs(b: Board, positions: { r: number; c: number }[]) {
  positions.forEach(({ r, c }) => {
    if (inBounds(r, c) && b[r][c] === 0) {
      b[r][c] = BOMB_VALUE
    }
  })
}

// 爆弾の爆発処理（3x3範囲を消去）
export function explodeBomb(b: Board, bombR: number, bombC: number): Set<string> {
  const exploded = new Set<string>()
  
  // 爆弾自体を消去
  exploded.add(`${bombR},${bombC}`)
  
  // 3x3範囲の周囲を消去
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const r = bombR + dr
      const c = bombC + dc
      if (inBounds(r, c) && b[r][c] !== 0) {
        exploded.add(`${r},${c}`)
      }
    }
  }
  
  return exploded
}

// 爆弾かどうかを判定
export function isBomb(value: Cell): boolean {
  return value === BOMB_VALUE
}
