import * as Phaser from 'phaser'
import { asset } from '@/lib/assets'
import { Board, COLS, ROWS, TYPES, BOMB_VALUE, createBoard, findMatches, clearMatches, collapseAndRefill, isAdjacent, swap, collectRuns, scoreForRuns, getBombPositions, createBombs, explodeBomb, isBomb } from '../board'

const TILE = 64
const PADDING = 8
const W = COLS * TILE
const H = ROWS * TILE
const FEVER_MAX = 100
const FEVER_DURATION = 10 // seconds
const DROP_DURATION_NORMAL = 160
const DROP_DURATION_FEVER = 100
const LANDING_BOUNCE_OFFSET = 6

type TileGO = Phaser.GameObjects.Image & { r: number; c: number; v: number }

export default class MainScene extends Phaser.Scene {
  board!: Board
  tiles: TileGO[][] = []
  originX = 0
  originY = 0
  selected: { r: number; c: number } | null = null
  score = 0
  timeLeft = 60
  comboLevel = 0
  feverGauge = 0
  feverActive = false
  feverTimeLeft = 0
  uiScore!: Phaser.GameObjects.Text
  uiTime!: Phaser.GameObjects.Text
  feverLabel!: Phaser.GameObjects.Text
  feverGaugeGraphics!: Phaser.GameObjects.Graphics
  feverOverlay!: Phaser.GameObjects.Rectangle
  ticking?: Phaser.Time.TimerEvent
  feverTimer?: Phaser.Time.TimerEvent
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
    this.load.image('item-bomb', asset('/images/items/bomb.svg'))
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
      case BOMB_VALUE: return 'item-bomb'
      default: return 'item-edamame'
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b0f19')
    // 背景をカメラ全体にフィット
    const cam = this.cameras.main
    this.add.image(0, 0, 'bg-choikichi').setOrigin(0, 0).setDisplaySize(cam.width, cam.height).setDepth(-10)
    // 画像は preload 済みの item-* を使用

    this.score = 0
    this.timeLeft = 60
    this.comboLevel = 0
    this.feverGauge = 0
    this.feverActive = false
    this.feverTimeLeft = 0

    this.board = createBoard(ROWS, COLS, TYPES)
    this.originX = (this.cameras.main.width - W) / 2
    this.originY = PADDING
    this.createGrid()

    this.input.on('pointerdown', this.onPointerDown, this)
    this.input.on('pointerup', this.onPointerUp, this)

    // UI
    this.uiScore = this.add.text(16, 8, 'SCORE 0', { fontFamily: 'monospace', fontSize: '18px', color: '#e6e9ef' })
    this.uiTime = this.add.text(300, 8, 'TIME 60', { fontFamily: 'monospace', fontSize: '18px', color: '#e6e9ef' })
    this.createFeverUI()

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

  createFeverUI() {
    const cam = this.cameras.main
    this.feverOverlay = this.add.rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0xffa552, 0)
      .setScrollFactor(0)
      .setDepth(-5)

    this.feverGaugeGraphics = this.add.graphics({ x: 16, y: 40 }).setScrollFactor(0)
    this.feverLabel = this.add.text(16, 52, '暖簾フィーバー 0%', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffd166'
    }).setScrollFactor(0)
    this.updateFeverUI()
  }

  updateFeverUI() {
    if (!this.feverGaugeGraphics || !this.feverLabel) return
    const width = 220
    const height = 14
    const value = this.feverActive ? (this.feverTimeLeft / FEVER_DURATION) * FEVER_MAX : this.feverGauge
    const clamped = Phaser.Math.Clamp(value, 0, FEVER_MAX)

    this.feverGaugeGraphics.clear()
    this.feverGaugeGraphics.fillStyle(0xffffff, 0.15)
    this.feverGaugeGraphics.fillRoundedRect(0, 0, width, height, 6)

    if (clamped > 0) {
      const ratio = clamped / FEVER_MAX
      const fillColor = this.feverActive ? 0xff6f61 : 0xffd166
      this.feverGaugeGraphics.fillStyle(fillColor, this.feverActive ? 0.9 : 0.8)
      this.feverGaugeGraphics.fillRoundedRect(2, 2, (width - 4) * ratio, height - 4, 4)
    }

    if (this.feverActive) {
      const remain = Math.max(0, this.feverTimeLeft).toFixed(1)
      this.feverLabel.setText(`暖簾フィーバー 残り${remain}秒`)
      this.feverLabel.setColor('#ffb3a7')
    } else {
      this.feverLabel.setText(`暖簾フィーバー ${Math.round(clamped)}%`)
      this.feverLabel.setColor('#ffd166')
    }
  }

  addFeverEnergy(amount: number) {
    if (amount <= 0) return
    if (this.feverActive) {
      const extraSeconds = Math.min(2, amount / 60)
      this.extendFever(extraSeconds)
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
      }
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

  createGrid() {
    for (let r = 0; r < ROWS; r++) {
      this.tiles[r] = []
      for (let c = 0; c < COLS; c++) {
        const v = this.board[r][c]
        const x = this.originX + c * TILE + TILE / 2
        const y = this.originY + r * TILE + TILE / 2
        const img = this.add.image(x, y, this.keyFor(v)) as TileGO
        img.setDisplaySize(TILE - 4, TILE - 4)
        img.setInteractive({ useHandCursor: true })
        // 画像の透過処理とレンダリング品質を改善
        img.setAlpha(1)
        img.setBlendMode(Phaser.BlendModes.NORMAL)
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
    if (!t || !t.scene) return // タイルが存在しないか既に破棄されている場合は何もしない
    
    // 既存のTweenを完全に停止
    this.tweens.killTweensOf(t)
    
    // 強制的に正常状態にリセット
    const { x, y } = this.boardToWorld(r, c)
    t.x = x
    t.y = y
    t.setDisplaySize(TILE - 4, TILE - 4) // setScaleの代わりにsetDisplaySizeを使用
    t.clearTint()
    
    // 選択エフェクトを適用
    if (on) {
      // 控えめな選択エフェクト（位置のみ変更、サイズは変更しない）
      this.tweens.add({
        targets: t,
        y: y - 4, // 浮き上がりエフェクトのみ
        duration: 100,
        ease: 'Sine.easeOut'
      })
      t.setTint(0xffffaa)
    }
    // off時は既にリセット済みなので何もしない
  }

  private dispatchMamaEmotion(emotion: 'normal' | 'smile' | 'surprise' | 'sad' | 'happy' | 'gameover') {
    const event = new CustomEvent('mamaEmotion', { detail: emotion });
    window.dispatchEvent(event);
  }

  private dispatchMasakiPopup() {
    const event = new CustomEvent('masakiPopup');
    window.dispatchEvent(event);
  }

  private getAudioContext(): AudioContext | null {
    const manager = this.sound as Phaser.Sound.WebAudioSoundManager | Phaser.Sound.HTML5AudioSoundManager | Phaser.Sound.NoAudioSoundManager
    if ('context' in manager) {
      const context = (manager as Phaser.Sound.WebAudioSoundManager).context
      if (context) {
        return context
      }
    }
    return null
  }

  private playTone(freq: number, duration: number, volume = 0.2) {
    if (this.sound.locked) return
    const ctx = this.getAudioContext()
    if (!ctx) return
    const now = ctx.currentTime
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(freq, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.05)
  }

  private playLandingBeat() {
    if (this.sound.locked) return
    this.playTone(220, 0.12, 0.18)
    this.time.delayedCall(90, () => this.playTone(320, 0.08, 0.12))
  }

  private playFeverChime() {
    if (this.sound.locked) return
    this.playTone(660, 0.25, 0.12)
    this.time.delayedCall(160, () => this.playTone(880, 0.2, 0.1))
  }

  async trySwap(a: { r: number; c: number }, b: { r: number; c: number }) {
    // 爆弾がクリックされた場合は即座に爆発
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
      const feverMult = this.feverActive ? 2 : 1
      const gained = Math.round(base * mult * feverMult)
      this.score += gained
      if (this.uiScore) this.uiScore.setText(`SCORE ${this.score}`)

      // 5個以上消去でmasaki登場
      const hasLongRun = runs.some(run => run >= 5)
      if (hasLongRun) {
        this.dispatchMasakiPopup()
        // 爆弾生成
        const bombPositions = getBombPositions(this.board, runs)
        createBombs(this.board, bombPositions)
      }

      const energyFromRuns = runs.reduce((acc, run) => acc + run * 8, 0)
      const comboBonus = this.comboLevel * 12
      if (hasLongRun) {
        this.addFeverEnergy(35)
      }
      this.addFeverEnergy(energyFromRuns + comboBonus)
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

    this.endFever()
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

  async explodeBombAt(bombR: number, bombC: number) {
    // 爆発エフェクト
    this.createExplosionEffect(bombR, bombC)
    
    // 爆発範囲を取得
    const exploded = explodeBomb(this.board, bombR, bombC)
    
    // スコア加算（爆発したタイル数 × 200点）
    const bombScore = exploded.size * 200
    this.score += bombScore
    if (this.uiScore) this.uiScore.setText(`SCORE ${this.score}`)

    // 爆発したタイルをアニメーション
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
        onComplete: () => resolve() 
      })
    })

    // 盤面から消去
    clearMatches(this.board, exploded)
    exploded.forEach((key) => {
      const [r, c] = key.split(',').map(Number)
      const go = this.tiles[r][c]
      if (go) {
        go.destroy()
        ;(this.tiles as any)[r][c] = null
      }
    })

    // 重力処理
    collapseAndRefill(this.board, TYPES)
    await this.animateCollapse()
    
    // 新しいマッチがあるかチェック
    await this.resolveMatches()
  }

  createExplosionEffect(r: number, c: number) {
    const { x, y } = this.boardToWorld(r, c)
    
    // 爆発円エフェクト
    const explosion = this.add.circle(x, y, 0, 0xff6600, 0.8)
    this.tweens.add({
      targets: explosion,
      radius: TILE * 1.5,
      alpha: 0,
      duration: 400,
      ease: 'Quad.easeOut',
      onComplete: () => explosion.destroy()
    })

    // 火花エフェクト
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const spark = this.add.circle(x, y, 3, 0xffaa00)
      const targetX = x + Math.cos(angle) * 50
      const targetY = y + Math.sin(angle) * 50
      
      this.tweens.add({
        targets: spark,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      })
    }
  }

  async animateCollapse() {
    // すべてのタイルのTweenを停止し、状態を完全にリセット
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const img = this.tiles[r][c]
        if (img && img.scene) {
          this.tweens.killTweensOf(img)
          // 位置とサイズを強制的にリセット
          const { x, y } = this.boardToWorld(r, c)
          img.x = x
          img.y = y
          img.setDisplaySize(TILE - 4, TILE - 4) // setScaleの代わりにsetDisplaySizeを使用
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
      // 画像の透過処理とレンダリング品質を改善
      img.setAlpha(0)
      img.setBlendMode(Phaser.BlendModes.NORMAL)
      img.r = r; img.c = c; img.v = v
      this.tiles[r][c] = img
      return img
    }

    const dropDuration = this.feverActive ? DROP_DURATION_FEVER : DROP_DURATION_NORMAL
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
              yoyo: true
            })
          }
        })
      }
    }
    await new Promise<void>((resolve) => this.time.delayedCall(dropDuration + 15, () => resolve()))
    this.playLandingBeat()
  }
}
