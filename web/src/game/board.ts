export type Cell = number // 0=空, 1..types=ピース種類
export type Board = Cell[][] // [row][col]

export const ROWS = 6
export const COLS = 6
export const TYPES = 4

const rand = (n: number) => Math.floor(Math.random() * n)

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
  // horizontal
  for (let r = 0; r < b.length; r++) {
    let run = 1
    for (let c = 1; c <= b[r].length; c++) {
      if (c < b[r].length && b[r][c] !== 0 && b[r][c] === b[r][c - 1]) {
        run++
      } else {
        if (run >= 3) {
          for (let k = 0; k < run; k++) matches.add(`${r},${c - 1 - k}`)
        }
        run = 1
      }
    }
  }
  // vertical
  for (let c = 0; c < b[0].length; c++) {
    let run = 1
    for (let r = 1; r <= b.length; r++) {
      if (r < b.length && b[r][c] !== 0 && b[r][c] === b[r - 1][c]) {
        run++
      } else {
        if (run >= 3) {
          for (let k = 0; k < run; k++) matches.add(`${r - 1 - k},${c}`)
        }
        run = 1
      }
    }
  }
  return matches
}

// スコア算出用に、横/縦の「連続数」を収集（3以上のみ）
export function collectRuns(b: Board) {
  const runs: number[] = []
  // horizontal runs
  for (let r = 0; r < b.length; r++) {
    let run = 1
    for (let c = 1; c <= b[r].length; c++) {
      if (c < b[r].length && b[r][c] !== 0 && b[r][c] === b[r][c - 1]) {
        run++
      } else {
        if (run >= 3) runs.push(run)
        run = 1
      }
    }
  }
  // vertical runs
  for (let c = 0; c < b[0].length; c++) {
    let run = 1
    for (let r = 1; r <= b.length; r++) {
      if (r < b.length && b[r][c] !== 0 && b[r][c] === b[r - 1][c]) {
        run++
      } else {
        if (run >= 3) runs.push(run)
        run = 1
      }
    }
  }
  return runs
}

export function scoreForRuns(runs: number[]) {
  // 基本: 1個=100点、4個ボーナス+500、5個以上は基本点のみ（特別アイテムは未実装）
  let score = 0
  for (const n of runs) {
    score += 100 * n
    if (n === 4) score += 500
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
