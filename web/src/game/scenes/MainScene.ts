import Phaser from 'phaser'
import { Board, COLS, ROWS, TYPES, createBoard, findMatches, clearMatches, collapseAndRefill, isAdjacent, swap } from '../board'

const TILE = 64
const PADDING = 8
const W = COLS * TILE
const H = ROWS * TILE

type TileGO = Phaser.GameObjects.Image & { r: number; c: number; v: number }

export default class MainScene extends Phaser.Scene {
  board!: Board
  tiles: TileGO[][] = []
  originX = 0
  originY = 0
  selected: { r: number; c: number } | null = null

  constructor() {
    super('MainScene')
  }

  preload() {}

  create() {
    this.cameras.main.setBackgroundColor('#0b0f19')
    // 原始テクスチャ（色違い）生成
    const colors = ['#e63946', '#ffd166', '#06d6a0', '#118ab2']
    colors.forEach((color, i) => {
      const g = this.add.graphics()
      g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1)
      g.fillRect(0, 0, TILE - 4, TILE - 4)
      g.generateTexture(`tile${i + 1}`, TILE - 4, TILE - 4)
      g.destroy()
    })

    this.board = createBoard(ROWS, COLS, TYPES)
    this.originX = (this.cameras.main.width - W) / 2
    this.originY = PADDING
    this.createGrid()

    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointerup', this.onPointerUp, this)
  }

  createGrid() {
    for (let r = 0; r < ROWS; r++) {
      this.tiles[r] = []
      for (let c = 0; c < COLS; c++) {
        const v = this.board[r][c]
        const x = this.originX + c * TILE + TILE / 2
        const y = this.originY + r * TILE + TILE / 2
        const img = this.add.image(x, y, `tile${v}`) as TileGO
        img.setDisplaySize(TILE - 4, TILE - 4)
        img.setInteractive({ useHandCursor: true })
        img.r = r; img.c = c; img.v = v
        this.tiles[r][c] = img
      }
    }
  }

  boardToWorld(r: number, c: number) {
    const x = this.originX + c * TILE + TILE / 2
    const y = this.originY + r * TILE + TILE / 2
    return { x, y }
  }

  pickCell(pointer: Phaser.Input.Pointer) {
    const cx = pointer.x - this.originX
    const cy = pointer.y - this.originY
    const c = Math.floor(cx / TILE)
    const r = Math.floor(cy / TILE)
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null
    return { r, c }
  }

  onPointerDown(pointer: Phaser.Input.Pointer) {
    const cell = this.pickCell(pointer)
    if (!cell) return
    this.selected = cell
    this.pulse(cell.r, cell.c, true)
  }

  onPointerUp(pointer: Phaser.Input.Pointer) {
    if (!this.selected) return
    const from = this.selected
    this.pulse(from.r, from.c, false)
    this.selected = null

    const to = this.pickCell(pointer)
    if (!to || !isAdjacent(from.r, from.c, to.r, to.c)) return
    this.trySwap(from, to)
  }

  pulse(r: number, c: number, on: boolean) {
    const t = this.tiles[r][c]
    this.tweens.add({ targets: t, scale: on ? 1.05 : 1, duration: 80 })
  }

  async trySwap(a: { r: number; c: number }, b: { r: number; c: number }) {
    await this.animateSwap(a, b)
    swap(this.board, a.r, a.c, b.r, b.c)
    const matches = findMatches(this.board)
    if (matches.size === 0) {
      // 戻す
      await this.animateSwap(a, b)
      swap(this.board, a.r, a.c, b.r, b.c)
      return
    }
    await this.resolveMatches()
  }

  async animateSwap(a: { r: number; c: number }, b: { r: number; c: number }) {
    const ta = this.tiles[a.r][a.c]
    const tb = this.tiles[b.r][b.c]
    // swap references in tiles grid
    this.tiles[a.r][a.c] = tb
    this.tiles[b.r][b.c] = ta
    const pa = this.boardToWorld(a.r, a.c)
    const pb = this.boardToWorld(b.r, b.c)
    return new Promise<void>((resolve) => {
      this.tweens.add({ targets: ta, x: pb.x, y: pb.y, duration: 120, ease: 'Sine.easeInOut' })
      this.tweens.add({ targets: tb, x: pa.x, y: pa.y, duration: 120, ease: 'Sine.easeInOut', onComplete: () => resolve() })
    })
  }

  async resolveMatches() {
    while (true) {
      const matches = findMatches(this.board)
      if (matches.size === 0) break
      // fade out matched
      await new Promise<void>((resolve) => {
        const tgs: Phaser.GameObjects.Image[] = []
        matches.forEach((key) => {
          const [r, c] = key.split(',').map(Number)
          const go = this.tiles[r][c]
          tgs.push(go)
        })
        this.tweens.add({ targets: tgs, alpha: 0, duration: 120, onComplete: () => resolve() })
      })
      clearMatches(this.board, matches)
      // remove and set placeholders
      matches.forEach((key) => {
        const [r, c] = key.split(',').map(Number)
        const go = this.tiles[r][c]
        go.destroy()
        // placeholder null, will refill after collapse
        // mark with null
        ;(this.tiles as any)[r][c] = null
      })

      // collapse model
      collapseAndRefill(this.board, TYPES)

      // rebuild tile gameobjects for nulls and animate fall
      await this.animateCollapse()
    }
  }

  async animateCollapse() {
    // ensure each position has a GO, create missing
    const createAt = (r: number, c: number) => {
      const v = this.board[r][c]
      const { x, y } = this.boardToWorld(r, c)
      const img = this.add.image(x, y - TILE * ROWS, `tile${v}`) as TileGO
      img.setDisplaySize(TILE - 4, TILE - 4)
      img.alpha = 0
      img.r = r; img.c = c; img.v = v
      this.tiles[r][c] = img
      return img
    }

    const tweens: Phaser.Tweens.Tween[] = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let img = this.tiles[r][c] as TileGO | null
        if (!img || !img.texture) {
          img = createAt(r, c)
        } else {
          // update texture if value changed
          const v = this.board[r][c]
          if (img.v !== v) {
            img.setTexture(`tile${v}`)
            img.v = v
          }
        }
        const { x, y } = this.boardToWorld(r, c)
        tweens.push(this.tweens.add({ targets: img, x, y, alpha: 1, duration: 160, ease: 'Sine.easeIn' }))
      }
    }
    await new Promise<void>((resolve) => this.time.delayedCall(170, () => resolve()))
  }
}

