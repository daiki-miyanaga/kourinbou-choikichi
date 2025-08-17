import React from 'react'
import Sprite, { SpriteProps } from './Sprite'

type MamaProps = Omit<SpriteProps, 'src'>

export default function Mama(props: MamaProps) {
  return (
    <Sprite
      src="/images/characters/mama/mama-sprite.png"
      alt="ママ（ドットキャラ）"
      frames={6}
      frameWidth={64}
      frameHeight={64}
      gutter={0}
      fps={6}
      scale={2}
      {...props}
    />
  )
}

