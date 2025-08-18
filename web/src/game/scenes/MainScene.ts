import * as Phaser from 'phaser'
import { asset } from '@/lib/assets'
import { Board, COLS, ROWS, TYPES, createBoard, findMatches, clearMatches, collapseAndRefill, isAdjacent, swap, collectRuns, scoreForRuns } from '../board'

const TILE = 64
const PADDING = 8
const W = COLS * TILE
const H = ROWS * TILE

type TileGO = Phaser.GameObjects.Image & { r: number; c: number; v: number; scale0: number }

export default class MainScene extends Phaser.Scene {
  board!: Board
  tiles: TileGO[][] = []
  originX = 0
  originY = 0
  selected: { r: number; c: number } | null = null
  score = 0
  timeLeft = 60
  comboLevel = 0
  uiScore!: Phaser.GameObjects.Text
  uiTime!: Phaser.GameObjects.Text
  ticking?: Phaser.Time.TimerEvent
  bgm?: Phaser.Sound.BaseSound

  constructor() {
    super('MainScene')
  }

  preload() {
    // 公開ディレクトリのアイテム画像（実素材）を読み込み
    this.load.image('item-gyusuji', asset('/images/items/gyuusuji.png'))
    this.load.image('item-edamame', asset('/images/items/edamame.png'))
    this.load.image('item-potatosalad', asset('/images/items/potatosalad.png'))
    this.load.image('item-sausage', asset('/images/items/sausage.png'))
    // 背景とママ
    this.load.image('bg-choikichi', asset('/images/backgrounds/choikichi.jpg'))
    this.load.image('mama-left', asset('/images/characters/mama/mama-left.png'))
    // BGM
    this.load.audio('bgm', [asset('/bgm-se/bgm.mp3')])
  }

  keyFor(v: number) {
    switch (v) {
      case 1: return 'item-gyusuji'
      case 2: return 'item-edamame'
      case 3: return 'item-potatosalad'
      case 4: return 'item-sausage'
      default: return 'item-edamame'
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0f19')
    // 背景をカメラ全体にフィット
    const cam = this.cameras.main
    this.add.image(0, 0, 'bg-choikichi').setOrigin(0, 0).setDisplaySize(cam.width, cam.height).setDepth(-10)
    // 画像は preload 済みの item-* を使用

    this.board = createBoard(ROWS, COLS, TYPES)
    this.originX = (this.cameras.main.width - W) / 2
    this.originY = PADDING
    this.createGrid()

    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointerup', this.onPointerUp, this)

    // UI
    this.uiScore = this.add.text(16, 8, 'SCORE 0', { fontFamily: 'monospace', fontSize: '18px', color: '#e6e9ef' })
    this.uiTime = this.add.text(300, 8, 'TIME 60', { fontFamily: 'monospace', fontSize: '18px', color: '#e6e9ef' })
    
    // バージョン情報を画面下部に表示
    const versionInfo = `v${Date.now().toString(36)}`
    this.add.text(this.cameras.main.width - 8, this.cameras.main.height - 8, versionInfo, { 
      fontFamily: 'monospace', 
      fontSize: '10px', 
      color: '#666666'
    }).setOrigin(1, 1).setAlpha(0.7)
    
    this.startTimer()

    // ママ画像はゲーム枠外（React 側）で表示するため、シーン内には配置しない

    // BGM 再生（ユーザー操作後に自動解錠）
    const playBgm = () => {
      if (this.bgm) return
      this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 })
      this.bgm.play()
    }
    if (this.sound.locked) {
      this.input.once('pointerdown', playBgm)
    } else {
      playBgm()
    }
  }

  createGrid() {
    for (let r = 0; r < ROWS; r++) {
      this.tiles[r] = []
      for (let c = 0; c < COLS; c++) {
        const v = this.board[r][c]
        const x = this.originX + c * TILE + TILE / 2
        const y = this.originY + r * TILE + TILE / 2
        const img = this.add.image(x, y, this.keyFor(v)) as TileGO
        img.setDisplaySize(TILE - 4, TILE - 4)
        img.scale0 = img.scale
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
    if (this.timeLeft <= 0) return
    const from = this.selected
    this.pulse(from.r, from.c, false)
    this.selected = null

    const to = this.pickCell(pointer)
    if (!to || !isAdjacent(from.r, from.c, to.r, to.c)) return
    this.trySwap(from, to)
  }

  pulse(r: number, c: number, on: boolean) {
    const t = this.tiles[r][c]
    const { y } = this.boardToWorld(r, c)

    // 既存のTweenをキルしてから位置とスケールを初期値に戻す
    this.tweens.killTweensOf(t)
    t.setY(y)
    t.setScale(t.scale0)

    // 選択中はタイルを浮き上がらせる効果
    if (on) {
      this.tweens.add({
        targets: t,
        y: y - 8,
        scaleX: t.scale0 * 1.1,
        scaleY: t.scale0 * 1.1,
        duration: 150,
        ease: 'Back.easeOut'
      })
      t.setTint(0xffffaa)
    } else {
      this.tweens.add({
        targets: t,
        y,
        scaleX: t.scale0,
        scaleY: t.scale0,
        duration: 150,
        ease: 'Back.easeIn',
        onComplete: () => {
          // Tweenが完了したら確実にスケールを初期値にセット
          t.setScale(t.scale0)
        }
      })
      t.clearTint()
    }
  }

  private dispatchMamaEmotion(emotion: 'normal' | 'smile' | 'surprise' | 'sad' | 'happy' | 'gameover') {
    const event = new CustomEvent('mamaEmotion', { detail: emotion });
    window.dispatchEvent(event);
  }

  async trySwap(a: { r: number; c: number }, b: { r: number; c: number }) {
    await this.animateSwap(a, b)
    swap(this.board, a.r, a.c, b.r, b.c)
    const matches = findMatches(this.board)
    if (matches.size === 0) {
      // 戻す
      this.dispatchMamaEmotion('sad');
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
    // 選択状態をクリア
    if (this.selected) {
      this.pulse(this.selected.r, this.selected.c, false)
      this.selected = null
    }
    
    this.comboLevel = 0
    while (true) {
      const matches = findMatches(this.board)
      if (matches.size === 0) break

      this.dispatchMamaEmotion('smile');
      if (this.comboLevel > 0) {
        this.dispatchMamaEmotion('surprise');
      }

      // スコア計算
      const runs = collectRuns(this.board)
      const base = scoreForRuns(runs)
      const multSeq = [1, 1.2, 1.5, 2, 3, 5]
      const mult = multSeq[Math.min(this.comboLevel, multSeq.length - 1)]
      const gained = Math.round(base * mult)
      this.score += gained
      if (this.uiScore) this.uiScore.setText(`SCORE ${this.score}`)
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
      this.comboLevel++
    }
  }

  startTimer() {
    this.timeLeft = 60
    if (this.uiTime) this.uiTime.setText(`TIME ${this.timeLeft}`)
    this.ticking?.remove(false)
    this.ticking = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
      this.timeLeft--
      if (this.uiTime) this.uiTime.setText(`TIME ${Math.max(0, this.timeLeft)}`)
      if (this.timeLeft <= 0) {
        this.endGame()
      }
    } })
  }

  endGame() {
    this.dispatchMamaEmotion('gameover');
    // 仕様書のリザルト高得点コメント
    if (this.score >= 8000) {
      this.dispatchMamaEmotion('happy');
    }

    this.ticking?.remove(false)
    this.input.off('pointerdown', this.onPointerDown, this)
    this.input.off('pointerup', this.onPointerUp, this)
    const w = 360, h = 200
    const x = (this.cameras.main.width - w) / 2
    const y = (this.cameras.main.height - h) / 2
    const panel = this.add.rectangle(x, y, w, h, 0x000000, 0.7).setOrigin(0).setStrokeStyle(2, 0xffffff, 0.5)
    const title = this.add.text(x + 16, y + 16, 'RESULT', { fontFamily: 'monospace', fontSize: '20px', color: '#e6e9ef' })
    const scoreText = this.add.text(x + 16, y + 56, `Score: ${this.score}`, { fontFamily: 'monospace', fontSize: '18px', color: '#e6e9ef' })
    const comment = this.commentForScore(this.score)
    const commentText = this.add.text(x + 16, y + 88, comment, { fontFamily: 'sans-serif', fontSize: '16px', color: '#ffd166', wordWrap: { width: w - 32 } })
    const btn = this.add.text(x + w - 120, y + h - 36, '[ Restart ]', { fontFamily: 'monospace', fontSize: '18px', color: '#06d6a0' })
      .setInteractive({ useHandCursor: true })
      .on('pointerup', () => {
        panel.destroy(); title.destroy(); scoreText.destroy(); commentText.destroy(); btn.destroy()
        this.scene.restart()
      })
  }

  commentForScore(s: number) {
    if (s >= 15000) return '盛り上がっとるぞいね！'
    if (s >= 8000) return 'やるじぃ、ほんに！'
    if (s >= 3000) return 'うまいげんて！'
    return 'また来まっし〜'
  }

  async animateCollapse() {
    // すべてのタイルのTweenを停止し、状態をリセット
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const img = this.tiles[r][c]
        if (img) {
          this.tweens.killTweensOf(img)
          // Tweenを停止した後、確実にスケールとティントをリセット
          img.setScale(1)
          img.clearTint()
        }
      }
    }
    
    // ensure each position has a GO, create missing
    const createAt = (r: number, c: number) => {
      const v = this.board[r][c]
      const { x, y } = this.boardToWorld(r, c)
      const img = this.add.image(x, y - TILE * ROWS, this.keyFor(v)) as TileGO
      img.setDisplaySize(TILE - 4, TILE - 4)
      img.setInteractive({ useHandCursor: true })
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
            img.setTexture(this.keyFor(v))
            img.setDisplaySize(TILE - 4, TILE - 4)
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
