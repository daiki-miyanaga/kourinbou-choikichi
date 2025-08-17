import React, { useMemo } from 'react'

type Orientation = 'horizontal' | 'vertical'

export type SpriteProps = {
  src: string
  frames?: number
  frameWidth?: number
  frameHeight?: number
  gutter?: number
  fps?: number
  scale?: number
  loop?: boolean
  playing?: boolean
  frame?: number // 指定時は静止表示（0始まり）
  orientation?: Orientation
  alt?: string
  className?: string
}

export default function Sprite({
  src,
  frames = 6,
  frameWidth = 64,
  frameHeight = 64,
  gutter = 0,
  fps = 6,
  scale = 2,
  loop = true,
  playing = true,
  frame,
  orientation = 'horizontal',
  alt,
  className,
}: SpriteProps) {
  const duration = useMemo(() => (frames > 0 && fps > 0 ? frames / fps : 1), [frames, fps])

  const animationName = useMemo(() => {
    const axis = orientation === 'horizontal' ? 'x' : 'y'
    return `sprite-${axis}-${frames}-${frameWidth}-${frameHeight}-${gutter}-${fps}`
  }, [orientation, frames, frameWidth, frameHeight, gutter, fps])

  const maxOffset = useMemo(() => {
    const step = (orientation === 'horizontal' ? frameWidth : frameHeight) + gutter
    return -step * (frames - 1)
  }, [orientation, frameWidth, frameHeight, gutter, frames])

  const isStatic = typeof frame === 'number'
  const backgroundPosition = useMemo(() => {
    if (!isStatic) return undefined
    const idx = Math.max(0, Math.min(frames - 1, frame!))
    const step = (orientation === 'horizontal' ? frameWidth : frameHeight) + gutter
    const x = orientation === 'horizontal' ? -idx * step : 0
    const y = orientation === 'vertical' ? -idx * step : 0
    return `${x}px ${y}px`
  }, [isStatic, frame, frames, orientation, frameWidth, frameHeight, gutter])

  const style: React.CSSProperties = {
    width: frameWidth,
    height: frameHeight,
    backgroundImage: `url(${src})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: backgroundPosition,
    imageRendering: 'pixelated',
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: 'top left',
    // アニメーション指定（静止時や一時停止時は付与しない）
    animationName: !isStatic && playing ? animationName : undefined,
    animationDuration: !isStatic && playing ? `${duration}s` : undefined,
    animationTimingFunction: !isStatic && playing ? `steps(${frames})` : undefined,
    animationIterationCount: !isStatic && playing ? (loop ? 'infinite' : '1') : undefined,
  }

  return (
    <div
      role={alt ? 'img' : undefined}
      aria-label={alt}
      className={className}
      style={style}
    >
      {/* 動的 keyframes を注入 */}
      {!isStatic && (
        <style>{`
          @keyframes ${animationName} {
            to {
              ${orientation === 'horizontal'
                ? `background-position-x: ${maxOffset}px;`
                : `background-position-y: ${maxOffset}px;`}
            }
          }
        `}</style>
      )}
    </div>
  )
}

