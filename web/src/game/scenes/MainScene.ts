import * as Phaser from 'phaser'
import { asset } from '@/lib/assets'
import {
  Board, COLS, ROWS, TYPES, BOMB_VALUE, createBoard, findMatches, clearMatches,
  collapseAndRefill, isAdjacent, inBounds, swap, scoreForRuns, getBombPositions,
  createBombs, explodeBomb, isBomb, scanRuns, Run, findHintMove, hasValidMove, shuffleBoard,
} from '../board'

const TILE = 64
const W = COLS * TILE
const H = ROWS * TILE
const BOARD_TOP = 68
const FEVER_MAX = 100
const FEVER_DURATION = 10 // seconds
const GAME_SECONDS = 60
const DROP_DURATION_NORMAL = 160
const DROP_DURATION_FEVER = 100
const LANDING_BOUNCE_OFFSET = 6
const HINT_DELAY = 5000
const SWIPE_THRESHOLD = 18
const COMBO_MULT = [1, 1.2, 1.5, 2, 3, 5]

type TileGO = Phaser.GameObjects.Image & { r: number; c: number; v: number }
type CellRef = { r: number; c: number }
type MamaEmotion = 'normal' | 'smile' | 'surprise' | 'sad' | 'happy' | 'gameover' | 'fever'

export default class MainScene extends Phaser.Scene {
  board!: Board
  tiles: TileGO[][] = []
  originX = 0
  originY = BOARD_TOP
  selected: CellRef | null = null
  selectionFrame!: Phaser.GameObjects.Graphics
  dragStart: { x: number; y: number; cell: CellRef } | null = null
  busy = false
  started = false
  gameOver = false
  endRequested = false
  score = 0
  timeLeft = GAME_SECONDS
  comboLevel = 0
  feverGauge = 0
  feverActive = false
  feverTimeLeft = 0
  uiScore!: Phaser.GameObjects.Text
  uiBest!: Phaser.GameObjects.Text
  uiTime!: Phaser.GameObjects.Text
  feverLabel!: Phaser.GameObjects.Text
  feverGaugeGraphics!: Phaser.GameObjects.Graphics
  feverOverlay!: Phaser.GameObjects.Rectangle
  ticking?: Phaser.Time.TimerEvent
  feverTimer?: Phaser.Time.TimerEvent
  hintTimer?: Phaser.Time.TimerEvent
  hintTween?: Phaser.Tweens.Tween
  hintTargets: TileGO[] = []
  bgm?: Phaser.Sound.BaseSound
  bestScore = 0
  timeWarningActive = false

  constructor() {
    super('MainScene')
  }

  preload() {
    this.load.image('item-gyusuji', asset('/images/items/gyuusuji.png'))
    this.load.image('item-edamame', asset('/images/items/edamame.png'))
    this.load.image('item-potatosalad', asset('/images/items/potatosalad.png'))
    this.load.image('item-sausage', asset('/images/items/sausage.png'))
    this.load.image('item-bomb', asset('/images/items/bomb.svg'))
    this.load.image('bg-choikichi', asset('/images/backgrounds/choikichi.jpg'))
    this.load.audio('bgm', [asset('/bgm-se/bgm.mp3')])
  }

  keyFor(v: number) {
    switch (v) {
      case 1: return 'item-gyusuji'
      case 2: return 'item-edamame'
      case 3: return 'item-potatosalad'
      case 4: return 'item-sausage'
      case BOMB_VALUE: return 'item-bomb'
      default: return 'item-edamame'
    }
  }

  create() {
    const cam = this.cameras.main
    this.cameras.main.setBackgroundColor('#0b0f19')
    this.add.image(0, 0, 'bg-choikichi').setOrigin(0, 0).setDisplaySize(cam.width, cam.height).setDepth(-10)
    this.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x2a1810, 0.3).setDepth(-9)

    // 状態リセット（restart 対応）
    this.score = 0
    this.timeLeft = GAME_SECONDS
    this.comboLevel = 0
    this.feverGauge = 0
    this.feverActive = false
    this.feverTimeLeft = 0
    this.busy = false
    this.started = false
    this.gameOver = false
    this.endRequested = false
    this.selected = null
    this.dragStart = null
    this.timeWarningActive = false
    this.hintTargets = []

    this.board = createBoard(ROWS, COLS, TYPES)
    if (!hasValidMove(this.board)) shuffleBoard(this.board, TYPES)
    this.originX = (cam.width - W) / 2
    this.originY = BOARD_TOP

    this.drawBoardFrame()
    this.createGrid()
    this.selectionFrame = this.add.graphics().setDepth(5)

    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointermove', this.onPointerMove, this)
    this.input.on('pointerup', this.onPointerUp, this)

    this.createHud()
    this.createFeverUI()
    this.loadBestScore()
    this.dispatchMamaEmotion('normal')

    // BGM 再生（ユーザー操作後に自動解錠）
    const playBgm = () => {
      if (this.bgm) return
      this.bgm = this.sound.add('bgm', { loop: true, volume: 0.4 })
      this.bgm.play()
    }
    if (this.sound.locked) {
      this.input.once('pointerdown', playBgm)
    } else {
      playBgm()
    }

    this.startCountdown()
  }

  // ───────────────────────── HUD ─────────────────────────

  createHud() {
    const cam = this.cameras.main

    this.add.rectangle(8, 6, 168, 34, 0x000000, 0.6).setOrigin(0, 0).setStrokeStyle(1, 0xffd166, 0.8)
    this.uiScore = this.add.text(18, 23, 'SCORE 0', {
      fontFamily: 'Arial',
      fontSize: '17px',
      color: '#ffd166',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5)

    this.add.rectangle(cam.width - 8, 6, 110, 34, 0x000000, 0.6).setOrigin(1, 0).setStrokeStyle(1, 0xff6b6b, 0.8)
    this.uiTime = this.add.text(cam.width - 18, 23, `⏰ ${GAME_SECONDS}`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ff6b6b',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5)

    this.uiBest = this.add.text(cam.width - 10, 52, 'BEST 0', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#8ecae6',
      fontStyle: 'bold',
    }).setOrigin(1, 0.5)
  }

  createFeverUI() {
    const cam = this.cameras.main
    this.feverOverlay = this.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0xffa552, 0)
      .setScrollFactor(0)
      .setDepth(-5)

    this.feverGaugeGraphics = this.add.graphics({ x: 8, y: 44 }).setScrollFactor(0)
    this.feverLabel = this.add.text(8 + 110, 52, '', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#fff8e7',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1)
    this.updateFeverUI()
  }

  updateFeverUI() {
    if (!this.feverGaugeGraphics || !this.feverLabel) return
    const width = 220
    const height = 16
    const value = this.feverActive ? (this.feverTimeLeft / FEVER_DURATION) * FEVER_MAX : this.feverGauge
    const clamped = Phaser.Math.Clamp(value, 0, FEVER_MAX)

    this.feverGaugeGraphics.clear()
    this.feverGaugeGraphics.fillStyle(0x000000, 0.45)
    this.feverGaugeGraphics.fillRoundedRect(0, 0, width, height, 8)
    this.feverGaugeGraphics.lineStyle(2, 0xffd166, 0.8)
    this.feverGaugeGraphics.strokeRoundedRect(0, 0, width, height, 8)

    if (clamped > 0) {
      const ratio = clamped / FEVER_MAX
      const fillColor = this.feverActive ? 0xff6f61 : 0xffd166
      this.feverGaugeGraphics.fillStyle(fillColor, this.feverActive ? 0.95 : 0.85)
      this.feverGaugeGraphics.fillRoundedRect(2, 2, (width - 4) * ratio, height - 4, 6)
      if (this.feverActive) {
        this.feverGaugeGraphics.fillStyle(0xffffff, 0.3)
        this.feverGaugeGraphics.fillRoundedRect(2, 2, (width - 4) * ratio, height - 4, 6)
      }
    }

    if (this.feverActive) {
      this.feverLabel.setText(`🔥 フィーバー 残り${Math.max(0, this.feverTimeLeft).toFixed(1)}秒`)
    } else {
      this.feverLabel.setText(`🍻 フィーバー ${Math.round(clamped)}%`)
    }
  }

  drawBoardFrame() {
    const frame = this.add.graphics()
    const boardX = this.originX - 6
    const boardY = this.originY - 6
    frame.fillStyle(0x000000, 0.35)
    frame.fillRoundedRect(boardX, boardY, W + 12, H + 12, 14)
    frame.lineStyle(3, 0xffd166, 0.7)
    frame.strokeRoundedRect(boardX, boardY, W + 12, H + 12, 14)

    const innerGlow = this.add.graphics()
    innerGlow.lineStyle(2, 0xffffff, 0.2)
    innerGlow.strokeRoundedRect(boardX + 2, boardY + 2, W + 8, H + 8, 12)
  }

  loadBestScore() {
    try {
      const raw = localStorage.getItem('choikichi-best-score')
      this.bestScore = raw ? Math.max(0, Number(raw)) : 0
    } catch {
      this.bestScore = 0
    }
    if (this.uiBest) this.uiBest.setText(`BEST ${Math.round(this.bestScore).toLocaleString()}`)
  }

  saveBestScore() {
    if (this.score <= this.bestScore) return
    this.bestScore = this.score
    if (this.uiBest) this.uiBest.setText(`BEST ${this.bestScore.toLocaleString()}`)
    try {
      localStorage.setItem('choikichi-best-score', String(this.bestScore))
    } catch {
      // noop
    }
  }

  // ───────────────────────── 開始演出 ─────────────────────────

  startCountdown() {
    const cam = this.cameras.main
    const overlay = this.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x000000, 0.45).setDepth(50)
    const label = this.add.text(cam.width / 2, BOARD_TOP + H / 2, '', {
      fontFamily: 'Arial',
      fontSize: '72px',
      color: '#ffd166',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(51)

    const steps = ['3', '2', '1', 'スタート！']
    let i = 0
    const step = () => {
      const isLast = i === steps.length - 1
      label.setText(steps[i])
      label.setFontSize(isLast ? 44 : 72)
      label.setScale(0.4).setAlpha(1)
      this.tweens.add({ targets: label, scale: 1, duration: 250, ease: 'Back.easeOut' })
      this.playTone(isLast ? 880 : 520, 0.12, 0.12, 'triangle')
      i++
      if (i < steps.length) {
        this.time.delayedCall(700, step)
      } else {
        this.time.delayedCall(650, () => {
          overlay.destroy()
          label.destroy()
          this.beginPlay()
        })
      }
    }
    step()
  }

  beginPlay() {
    this.started = true
    this.startTimer()
    this.resetHintTimer()
  }

  // ───────────────────────── 入力 ─────────────────────────

  private canAct() {
    return this.started && !this.busy && !this.gameOver
  }

  pickCell(pointer: Phaser.Input.Pointer): CellRef | null {
    const c = Math.floor((pointer.x - this.originX) / TILE)
    const r = Math.floor((pointer.y - this.originY) / TILE)
    if (!inBounds(r, c)) return null
    return { r, c }
  }

  onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.canAct()) return
    const cell = this.pickCell(pointer)
    if (!cell) return
    this.dragStart = { x: pointer.x, y: pointer.y, cell }
  }

  onPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.dragStart || !pointer.isDown || !this.canAct()) return
    const dx = pointer.x - this.dragStart.x
    const dy = pointer.y - this.dragStart.y
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return

    const from = this.dragStart.cell
    this.dragStart = null
    const horizontal = Math.abs(dx) >= Math.abs(dy)
    const to = horizontal
      ? { r: from.r, c: from.c + Math.sign(dx) }
      : { r: from.r + Math.sign(dy), c: from.c }
    if (!inBounds(to.r, to.c)) return
    this.setSelected(null)
    void this.runAction(() => this.doSwap(from, to))
  }

  onPointerUp(pointer: Phaser.Input.Pointer) {
    const start = this.dragStart
    this.dragStart = null
    if (!start || !this.canAct()) return

    const cell = this.pickCell(pointer)
    if (!cell) return

    // 別マスで離した場合は隣接スワップとして扱う
    if (cell.r !== start.cell.r || cell.c !== start.cell.c) {
      if (isAdjacent(start.cell.r, start.cell.c, cell.r, cell.c)) {
        this.setSelected(null)
        void this.runAction(() => this.doSwap(start.cell, cell))
      }
      return
    }

    // タップ操作
    if (isBomb(this.board[cell.r][cell.c])) {
      this.setSelected(null)
      void this.runAction(() => this.explodeBombAt(cell.r, cell.c))
      return
    }
    if (this.selected) {
      const prev = this.selected
      if (prev.r === cell.r && prev.c === cell.c) {
        this.setSelected(null)
        return
      }
      if (isAdjacent(prev.r, prev.c, cell.r, cell.c)) {
        this.setSelected(null)
        void this.runAction(() => this.doSwap(prev, cell))
        return
      }
    }
    this.setSelected(cell)
  }

  setSelected(cell: CellRef | null) {
    this.selected = cell
    this.selectionFrame.clear()
    if (!cell) return
    const x = this.originX + cell.c * TILE
    const y = this.originY + cell.r * TILE
    this.selectionFrame.lineStyle(3, 0xffe066, 0.95)
    this.selectionFrame.strokeRoundedRect(x + 2, y + 2, TILE - 4, TILE - 4, 10)
  }

  // すべてのプレイヤー操作はここを通す（多重実行・タイムアップとの競合を防ぐ）
  private async runAction(fn: () => Promise<void>) {
    if (this.busy || this.gameOver) return
    this.busy = true
    this.clearHint()
    this.hintTimer?.remove()
    try {
      await fn()
    } finally {
      this.busy = false
      this.afterAction()
    }
  }

  private afterAction() {
    if (this.endRequested) {
      this.endRequested = false
      this.endGame()
      return
    }
    if (this.gameOver) return
    if (!hasValidMove(this.board)) {
      void this.reshuffleBoard()
      return
    }
    this.resetHintTimer()
  }

  // ───────────────────────── ヒント / シャッフル ─────────────────────────

  resetHintTimer() {
    this.clearHint()
    this.hintTimer?.remove()
    this.hintTimer = this.time.delayedCall(HINT_DELAY, () => this.showHint())
  }

  showHint() {
    if (this.busy || this.gameOver || !this.started) return
    const hint = findHintMove(this.board)
    if (!hint) return
    const targets = new Set<TileGO>()
    const a = this.tiles[hint.from.r]?.[hint.from.c]
    const b = this.tiles[hint.to.r]?.[hint.to.c]
    if (a) targets.add(a)
    if (b) targets.add(b)
    if (targets.size === 0) return
    this.hintTargets = Array.from(targets)
    this.hintTargets.forEach((t) => t.setTint(0xfff2b3))
    this.hintTween = this.tweens.add({
      targets: this.hintTargets,
      alpha: 0.45,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  clearHint() {
    this.hintTween?.remove()
    this.hintTween = undefined
    this.hintTargets.forEach((t) => {
      if (t && t.scene) {
        t.setAlpha(1)
        t.clearTint()
      }
    })
    this.hintTargets = []
  }

  private async reshuffleBoard() {
    this.busy = true
    try {
      this.showCenterBanner('おつまみ シャッフル！', '#4ecdc4')
      this.playTone(420, 0.15, 0.12, 'triangle')
      await this.fadeAllTiles(0)
      shuffleBoard(this.board, TYPES)
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = this.tiles[r][c]
          const v = this.board[r][c]
          if (tile && tile.scene && tile.v !== v) {
            tile.setTexture(this.keyFor(v))
            tile.setDisplaySize(TILE - 4, TILE - 4)
            tile.v = v
          }
        }
      }
      await this.fadeAllTiles(1)
    } finally {
      this.busy = false
      if (!this.gameOver) this.resetHintTimer()
      if (this.endRequested) {
        this.endRequested = false
        this.endGame()
      }
    }
  }

  private fadeAllTiles(alpha: number) {
    const targets: TileGO[] = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = this.tiles[r][c]
        if (t && t.scene) targets.push(t)
      }
    }
    return new Promise<void>((resolve) => {
      this.tweens.add({ targets, alpha, duration: 220, ease: 'Sine.easeInOut', onComplete: () => resolve() })
    })
  }

  // ───────────────────────── ママ連携 / サウンド ─────────────────────────

  private dispatchMamaEmotion(emotion: MamaEmotion) {
    window.dispatchEvent(new CustomEvent('mamaEmotion', { detail: emotion }))
  }

  private dispatchMasakiPopup() {
    window.dispatchEvent(new CustomEvent('masakiPopup'))
  }

  private vibrate(ms: number) {
    try {
      navigator.vibrate?.(ms)
    } catch {
      // noop
    }
  }

  private getAudioContext(): AudioContext | null {
    const manager = this.sound as Phaser.Sound.WebAudioSoundManager | Phaser.Sound.HTML5AudioSoundManager | Phaser.Sound.NoAudioSoundManager
    if ('context' in manager) {
      const context = (manager as Phaser.Sound.WebAudioSoundManager).context
      if (context) return context
    }
    return null
  }

  private playTone(freq: number, duration: number, volume = 0.2, type: OscillatorType = 'sine') {
    if (this.sound.locked) return
    const ctx = this.getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(freq, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.05)
  }

  private playMatchSound(comboLevel: number) {
    const baseFreq = 440 + comboLevel * 110
    this.playTone(baseFreq, 0.15, 0.15, 'triangle')
    this.time.delayedCall(80, () => this.playTone(baseFreq * 1.5, 0.1, 0.1, 'triangle'))
  }

  private playBuzz() {
    this.playTone(150, 0.18, 0.12, 'square')
  }

  private playLandingBeat() {
    this.playTone(220, 0.12, 0.12, 'square')
    this.time.delayedCall(90, () => this.playTone(320, 0.08, 0.08, 'square'))
  }

  private playFeverChime() {
    this.playTone(660, 0.25, 0.12, 'sawtooth')
    this.time.delayedCall(120, () => this.playTone(880, 0.2, 0.1, 'sawtooth'))
    this.time.delayedCall(240, () => this.playTone(1100, 0.15, 0.08, 'sawtooth'))
  }

  private playBombSound() {
    this.playTone(80, 0.3, 0.2, 'sawtooth')
    this.time.delayedCall(50, () => this.playTone(60, 0.2, 0.15, 'square'))
  }

  // ───────────────────────── フィーバー ─────────────────────────

  addFeverEnergy(amount: number) {
    if (amount <= 0) return
    if (this.feverActive) {
      this.extendFever(Math.min(2, amount / 60))
      return
    }
    this.feverGauge = Phaser.Math.Clamp(this.feverGauge + amount, 0, FEVER_MAX)
    if (this.feverGauge >= FEVER_MAX) {
      this.activateFever()
    }
    this.updateFeverUI()
  }

  activateFever() {
    if (this.feverActive) return
    this.feverActive = true
    this.feverGauge = FEVER_MAX
    this.feverTimeLeft = FEVER_DURATION
    this.updateFeverUI()
    this.playFeverChime()
    this.dispatchMamaEmotion('fever')
    this.showCenterBanner('🔥 フィーバー！ ×2 🔥', '#ff6f61')
    if (this.feverOverlay) {
      this.tweens.add({ targets: this.feverOverlay, alpha: 0.35, duration: 250, ease: 'Sine.easeOut' })
    }
    this.sound.setRate(1.12)
    this.feverTimer?.remove()
    this.feverTimer = this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        this.feverTimeLeft = Math.max(0, this.feverTimeLeft - 0.1)
        if (this.feverTimeLeft <= 0) {
          this.endFever()
        } else {
          this.updateFeverUI()
        }
      },
    })
  }

  extendFever(extraSeconds: number) {
    if (!this.feverActive || extraSeconds <= 0) return
    this.feverTimeLeft = Phaser.Math.Clamp(this.feverTimeLeft + extraSeconds, 0, FEVER_DURATION + 2)
    this.updateFeverUI()
  }

  endFever() {
    if (!this.feverActive) return
    this.feverActive = false
    this.feverGauge = 0
    this.feverTimer?.remove()
    this.feverTimer = undefined
    if (this.feverOverlay) {
      this.tweens.add({ targets: this.feverOverlay, alpha: 0, duration: 250, ease: 'Sine.easeOut' })
    }
    this.sound.setRate(1)
    this.updateFeverUI()
  }

  // ───────────────────────── 盤面描画 ─────────────────────────

  createGrid() {
    for (let r = 0; r < ROWS; r++) {
      this.tiles[r] = []
      for (let c = 0; c < COLS; c++) {
        const v = this.board[r][c]
        const { x, y } = this.boardToWorld(r, c)
        const img = this.add.image(x, y, this.keyFor(v)) as TileGO
        img.setDisplaySize(TILE - 4, TILE - 4)
        img.setInteractive({ useHandCursor: true })
        img.r = r; img.c = c; img.v = v
        this.tiles[r][c] = img
      }
    }
  }

  boardToWorld(r: number, c: number) {
    return {
      x: this.originX + c * TILE + TILE / 2,
      y: this.originY + r * TILE + TILE / 2,
    }
  }

  // ───────────────────────── 演出ヘルパー ─────────────────────────

  showFloatingText(x: number, y: number, text: string, color = '#ffd166') {
    const label = this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: '20px',
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(20)

    this.tweens.add({
      targets: label,
      y: y - 36,
      alpha: 0,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    })
  }

  showCenterBanner(text: string, color = '#ffd166') {
    const banner = this.add.text(this.cameras.main.width / 2, BOARD_TOP + H / 2, text, {
      fontFamily: 'Arial',
      fontSize: '30px',
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(30).setScale(0.5).setAlpha(0)

    this.tweens.add({
      targets: banner,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: banner,
          alpha: 0,
          y: banner.y - 30,
          delay: 600,
          duration: 350,
          onComplete: () => banner.destroy(),
        })
      },
    })
  }

  showComboBanner(comboLevel: number, mult: number) {
    if (comboLevel <= 0) return
    this.showCenterBanner(`${comboLevel + 1} コンボ！ ×${mult}`, '#4ecdc4')
  }

  createMatchParticles(matches: Set<string>) {
    matches.forEach((key) => {
      const [r, c] = key.split(',').map(Number)
      const { x, y } = this.boardToWorld(r, c)
      for (let i = 0; i < 3; i++) {
        const particle = this.add.circle(
          x + (Math.random() - 0.5) * 20,
          y + (Math.random() - 0.5) * 20,
          2 + Math.random() * 3,
          0xffd700,
          0.8,
        ).setDepth(15)
        this.tweens.add({
          targets: particle,
          y: y - 30 - Math.random() * 20,
          alpha: 0,
          scaleX: 0,
          scaleY: 0,
          duration: 800 + Math.random() * 400,
          ease: 'Quad.easeOut',
          onComplete: () => particle.destroy(),
        })
      }
    })
  }

  createExplosionEffect(r: number, c: number) {
    const { x, y } = this.boardToWorld(r, c)
    const explosion = this.add.circle(x, y, 0, 0xff6600, 0.8).setDepth(15)
    this.tweens.add({
      targets: explosion,
      radius: TILE * 1.8,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => explosion.destroy(),
    })

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const spark = this.add.circle(x, y, 2 + Math.random() * 2, 0xffaa00).setDepth(15)
      const distance = 40 + Math.random() * 30
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 400 + Math.random() * 200,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      })
    }

    this.cameras.main.shake(200, 0.01)
  }

  centerOfMatches(matches: Set<string>) {
    let sx = 0
    let sy = 0
    let n = 0
    matches.forEach((key) => {
      const [r, c] = key.split(',').map(Number)
      const pos = this.boardToWorld(r, c)
      sx += pos.x
      sy += pos.y
      n += 1
    })
    if (n === 0) return { x: this.cameras.main.centerX, y: this.cameras.main.centerY }
    return { x: sx / n, y: sy / n }
  }

  // ───────────────────────── ゲームロジック ─────────────────────────

  async doSwap(a: CellRef, b: CellRef) {
    if (isBomb(this.board[a.r][a.c])) {
      await this.explodeBombAt(a.r, a.c)
      return
    }
    if (isBomb(this.board[b.r][b.c])) {
      await this.explodeBombAt(b.r, b.c)
      return
    }

    await this.animateSwap(a, b)
    swap(this.board, a.r, a.c, b.r, b.c)
    const matches = findMatches(this.board)
    if (matches.size === 0) {
      this.dispatchMamaEmotion('sad')
      this.playBuzz()
      await this.animateSwap(a, b)
      swap(this.board, a.r, a.c, b.r, b.c)
      return
    }
    await this.resolveMatches()
  }

  async animateSwap(a: CellRef, b: CellRef) {
    const ta = this.tiles[a.r][a.c]
    const tb = this.tiles[b.r][b.c]
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
    this.setSelected(null)
    this.comboLevel = 0

    while (true) {
      const matches = findMatches(this.board)
      if (matches.size === 0) break

      this.dispatchMamaEmotion(this.comboLevel > 0 ? 'surprise' : 'smile')
      this.playMatchSound(this.comboLevel)
      this.vibrate(20)

      const runs: Run[] = scanRuns(this.board)
      const base = scoreForRuns(runs.map((run) => run.length))
      const mult = COMBO_MULT[Math.min(this.comboLevel, COMBO_MULT.length - 1)]
      const feverMult = this.feverActive ? 2 : 1
      const gained = Math.round(base * mult * feverMult)
      this.score += gained
      if (this.uiScore) this.uiScore.setText(`SCORE ${this.score.toLocaleString()}`)
      const center = this.centerOfMatches(matches)
      this.showFloatingText(center.x, center.y, `+${gained.toLocaleString()}`, this.feverActive ? '#ffb3a7' : '#ffd166')
      this.showComboBanner(this.comboLevel, mult)

      const hasLongRun = runs.some((run) => run.length >= 5)
      if (hasLongRun) {
        this.dispatchMasakiPopup()
        this.showFloatingText(center.x, center.y - 24, '金箔ビール GET！', '#4ecdc4')
      }

      const energyFromRuns = runs.reduce((acc, run) => acc + run.length * 8, 0)
      if (hasLongRun) this.addFeverEnergy(35)
      this.addFeverEnergy(energyFromRuns + this.comboLevel * 12)
      this.createMatchParticles(matches)

      // 消去アニメーション
      await new Promise<void>((resolve) => {
        const tgs: Phaser.GameObjects.Image[] = []
        matches.forEach((key) => {
          const [r, c] = key.split(',').map(Number)
          const go = this.tiles[r][c]
          if (go) tgs.push(go)
        })
        this.tweens.add({
          targets: tgs,
          alpha: 0,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 200,
          ease: 'Back.easeIn',
          onComplete: () => resolve(),
        })
      })

      clearMatches(this.board, matches)
      // 5個以上消しの爆弾は消去後の空きマスに生成する
      if (hasLongRun) {
        createBombs(this.board, getBombPositions(runs))
      }

      matches.forEach((key) => {
        const [r, c] = key.split(',').map(Number)
        const go = this.tiles[r][c]
        if (go) go.destroy()
        ;(this.tiles[r] as (TileGO | null)[])[c] = null
      })

      collapseAndRefill(this.board, TYPES)
      await this.animateCollapse()
      this.comboLevel++
    }
  }

  async explodeBombAt(bombR: number, bombC: number) {
    this.playBombSound()
    this.vibrate(40)
    this.createExplosionEffect(bombR, bombC)

    const exploded = explodeBomb(this.board, bombR, bombC)

    const bombScore = exploded.size * 200
    this.score += bombScore
    if (this.uiScore) this.uiScore.setText(`SCORE ${this.score.toLocaleString()}`)
    const center = this.centerOfMatches(exploded)
    this.showFloatingText(center.x, center.y, `💥 +${bombScore.toLocaleString()}`, '#ff7b54')
    this.addFeverEnergy(exploded.size * 6)

    await new Promise<void>((resolve) => {
      const tgs: Phaser.GameObjects.Image[] = []
      exploded.forEach((key) => {
        const [r, c] = key.split(',').map(Number)
        const go = this.tiles[r][c]
        if (go) tgs.push(go)
      })
      this.tweens.add({
        targets: tgs,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 300,
        ease: 'Back.easeIn',
        onComplete: () => resolve(),
      })
    })

    clearMatches(this.board, exploded)
    exploded.forEach((key) => {
      const [r, c] = key.split(',').map(Number)
      const go = this.tiles[r][c]
      if (go) go.destroy()
      ;(this.tiles[r] as (TileGO | null)[])[c] = null
    })

    collapseAndRefill(this.board, TYPES)
    await this.animateCollapse()
    await this.resolveMatches()
  }

  async animateCollapse() {
    // 進行中の Tween を止めて位置・サイズを正規化
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const img = this.tiles[r][c]
        if (img && img.scene) {
          this.tweens.killTweensOf(img)
          const { x, y } = this.boardToWorld(r, c)
          img.x = x
          img.y = y
          img.setDisplaySize(TILE - 4, TILE - 4)
          img.clearTint()
        }
      }
    }

    const createAt = (r: number, c: number) => {
      const v = this.board[r][c]
      const { x, y } = this.boardToWorld(r, c)
      const img = this.add.image(x, y - TILE * ROWS, this.keyFor(v)) as TileGO
      img.setDisplaySize(TILE - 4, TILE - 4)
      img.setInteractive({ useHandCursor: true })
      img.setAlpha(0)
      img.r = r; img.c = c; img.v = v
      this.tiles[r][c] = img
      return img
    }

    const dropDuration = this.feverActive ? DROP_DURATION_FEVER : DROP_DURATION_NORMAL
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let img = this.tiles[r][c] as TileGO | null
        if (!img || !img.scene) {
          img = createAt(r, c)
        } else {
          const v = this.board[r][c]
          if (img.v !== v) {
            img.setTexture(this.keyFor(v))
            img.setDisplaySize(TILE - 4, TILE - 4)
            img.v = v
          }
        }
        const { x, y } = this.boardToWorld(r, c)
        this.tweens.add({
          targets: img,
          x,
          y,
          alpha: 1,
          duration: dropDuration,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.tweens.add({
              targets: img,
              y: y + LANDING_BOUNCE_OFFSET,
              duration: 90,
              ease: 'Sine.easeOut',
              yoyo: true,
            })
          },
        })
      }
    }
    await new Promise<void>((resolve) => this.time.delayedCall(dropDuration + 15, () => resolve()))
    this.playLandingBeat()
  }

  // ───────────────────────── タイマー / 終了 ─────────────────────────

  startTimer() {
    this.timeLeft = GAME_SECONDS
    if (this.uiTime) this.uiTime.setText(`⏰ ${this.timeLeft}`)
    this.ticking?.remove(false)
    this.ticking = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.timeLeft--
        if (this.uiTime) this.uiTime.setText(`⏰ ${Math.max(0, this.timeLeft)}`)
        if (this.timeLeft <= 10 && this.timeLeft > 0) {
          this.enableTimeWarning()
        }
        if (this.timeLeft <= 5 && this.timeLeft > 0) {
          this.playTone(880, 0.08, 0.1, 'square')
        }
        if (this.timeLeft <= 0) {
          this.ticking?.remove(false)
          this.endGame()
        }
      },
    })
  }

  enableTimeWarning() {
    if (this.timeWarningActive || !this.uiTime) return
    this.timeWarningActive = true
    this.uiTime.setColor('#ff2e63')
    this.tweens.add({
      targets: this.uiTime,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 320,
      yoyo: true,
      repeat: -1,
    })
    this.cameras.main.flash(220, 255, 50, 90, false)
  }

  endGame() {
    if (this.gameOver) return
    if (this.busy) {
      // 連鎖の解決中なら、解決後に終了処理する
      this.endRequested = true
      return
    }
    this.gameOver = true
    this.started = false
    this.endFever()
    this.clearHint()
    this.hintTimer?.remove()
    this.ticking?.remove(false)
    this.setSelected(null)

    const isNewRecord = this.score > this.bestScore
    this.saveBestScore()
    this.dispatchMamaEmotion(this.score >= 8000 ? 'happy' : 'gameover')

    const cam = this.cameras.main
    const timeUp = this.add.text(cam.width / 2, BOARD_TOP + H / 2, 'タイムアップ！', {
      fontFamily: 'Arial',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#ffd166',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(99).setScale(0.4)
    this.playTone(523, 0.3, 0.15, 'triangle')
    this.time.delayedCall(150, () => this.playTone(392, 0.4, 0.15, 'triangle'))
    this.tweens.add({ targets: timeUp, scale: 1, duration: 300, ease: 'Back.easeOut' })
    this.time.delayedCall(1000, () => {
      timeUp.destroy()
      this.showResult(isNewRecord)
    })
  }

  rankForScore(s: number): { rank: string; title: string; color: string } {
    if (s >= 15000) return { rank: 'S', title: '伝説の常連さん！', color: '#ffd700' }
    if (s >= 8000) return { rank: 'A', title: 'ちょい吉マスター', color: '#ff8fa3' }
    if (s >= 3000) return { rank: 'B', title: 'いい飲みっぷり', color: '#8ecae6' }
    return { rank: 'C', title: 'まずは一杯から', color: '#b5bac4' }
  }

  commentForScore(s: number) {
    if (s >= 15000) return '盛り上がっとるぞいね！ちょい吉のママもびっくりや！'
    if (s >= 8000) return 'やるじぃ、ほんに！'
    if (s >= 3000) return 'うまいげんて！'
    return 'また寄ってってまっし〜'
  }

  showResult(isNewRecord: boolean) {
    const cam = this.cameras.main
    const container = this.add.container(0, 0).setDepth(100)

    const overlay = this.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x000000, 0.6)
    overlay.setInteractive()
    container.add(overlay)

    const pw = 320
    const ph = 300
    const px = (cam.width - pw) / 2
    const py = (cam.height - ph) / 2
    const cx = cam.width / 2

    const panel = this.add.graphics()
    panel.fillStyle(0x10131c, 0.94)
    panel.fillRoundedRect(px, py, pw, ph, 18)
    panel.lineStyle(3, 0xffd166, 0.9)
    panel.strokeRoundedRect(px, py, pw, ph, 18)
    container.add(panel)

    const title = this.add.text(cx, py + 28, '本日の成績', {
      fontFamily: 'Arial', fontSize: '20px', fontStyle: 'bold', color: '#ffd166',
    }).setOrigin(0.5)
    container.add(title)

    const { rank, title: rankTitle, color } = this.rankForScore(this.score)
    const rankText = this.add.text(cx, py + 80, rank, {
      fontFamily: 'Arial', fontSize: '52px', fontStyle: 'bold', color,
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setScale(0)
    container.add(rankText)
    this.tweens.add({ targets: rankText, scale: 1, duration: 400, delay: 350, ease: 'Back.easeOut' })

    const rankTitleText = this.add.text(cx, py + 118, rankTitle, {
      fontFamily: 'Arial', fontSize: '15px', fontStyle: 'bold', color,
    }).setOrigin(0.5)
    container.add(rankTitleText)

    const comment = this.add.text(cx, py + 146, `「${this.commentForScore(this.score)}」`, {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#fff8e7',
      wordWrap: { width: pw - 36 }, align: 'center',
    }).setOrigin(0.5, 0)
    container.add(comment)

    const scoreText = this.add.text(cx, py + 192, 'スコア 0', {
      fontFamily: 'Arial', fontSize: '24px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
    container.add(scoreText)
    const counter = { value: 0 }
    this.tweens.add({
      targets: counter,
      value: this.score,
      duration: 900,
      ease: 'Cubic.easeOut',
      onUpdate: () => scoreText.setText(`スコア ${Math.round(counter.value).toLocaleString()}`),
    })

    const bestLine = isNewRecord
      ? `🏆 NEW RECORD！自己ベスト更新！`
      : `自己ベスト ${this.bestScore.toLocaleString()}`
    const bestText = this.add.text(cx, py + 222, bestLine, {
      fontFamily: 'Arial', fontSize: '13px', fontStyle: 'bold',
      color: isNewRecord ? '#ffd700' : '#8ecae6',
    }).setOrigin(0.5)
    container.add(bestText)
    if (isNewRecord) {
      this.tweens.add({ targets: bestText, alpha: 0.35, duration: 420, yoyo: true, repeat: -1 })
    }

    const btn = this.add.rectangle(cx, py + ph - 36, 210, 44, 0xe76f51, 1)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setInteractive({ useHandCursor: true })
    const btnText = this.add.text(cx, py + ph - 36, 'もういっかい あそぶ！', {
      fontFamily: 'Arial', fontSize: '16px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5)
    container.add(btn)
    container.add(btnText)
    btn.on('pointerover', () => btn.setFillStyle(0xf4845f))
    btn.on('pointerout', () => btn.setFillStyle(0xe76f51))
    btn.on('pointerup', () => {
      this.playTone(660, 0.12, 0.12, 'triangle')
      container.destroy()
      this.scene.restart()
    })
  }
}
