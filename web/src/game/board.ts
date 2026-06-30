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

// 爆弾の爆発処理（3x3範囲を消去、巻き込んだ爆弾は連鎖爆発）
export function explodeBomb(b: Board, bombR: number, bombC: number): Set<string> {
  const exploded = new Set<string>()
  const queue: [number, number][] = [[bombR, bombC]]
  exploded.add(`${bombR},${bombC}`)

  while (queue.length > 0) {
    const [br, bc] = queue.shift()!
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = br + dr
        const c = bc + dc
        const key = `${r},${c}`
        if (!inBounds(r, c) || b[r][c] === 0 || exploded.has(key)) continue
        exploded.add(key)
        if (isBomb(b[r][c])) queue.push([r, c])
      }
    }
  }

  return exploded
}

// 爆弾かどうかを判定
export function isBomb(value: Cell): boolean {
  return value === BOMB_VALUE
}

export interface Move {
  from: { r: number; c: number }
  to: { r: number; c: number }
}

// マッチを作れる手をひとつ探す（爆弾はそれ自体が有効手）
export function findHintMove(b: Board): Move | null {
  const rows = b.length
  const cols = b[0]?.length ?? 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (isBomb(b[r][c])) return { from: { r, c }, to: { r, c } }
      for (const [dr, dc] of [[0, 1], [1, 0]] as const) {
        const r2 = r + dr
        const c2 = c + dc
        if (r2 >= rows || c2 >= cols) continue
        swap(b, r, c, r2, c2)
        const matched = findMatches(b).size > 0
        swap(b, r, c, r2, c2)
        if (matched) return { from: { r, c }, to: { r: r2, c: c2 } }
      }
    }
  }
  return null
}

export function hasValidMove(b: Board): boolean {
  return findHintMove(b) !== null
}

// 手詰まり時のシャッフル。爆弾の位置は保持し、
// 初期マッチなし & 有効手ありの盤面になるまで再抽選する
export function shuffleBoard(b: Board, types = TYPES) {
  const rows = b.length
  const cols = b[0]?.length ?? 0
  for (let attempt = 0; attempt < 60; attempt++) {
    const fresh = createBoard(rows, cols, types)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!isBomb(b[r][c])) b[r][c] = fresh[r][c]
      }
    }
    if (findMatches(b).size === 0 && hasValidMove(b)) return
  }
}
