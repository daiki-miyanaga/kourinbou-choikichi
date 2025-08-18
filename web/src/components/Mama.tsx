"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./Mama.module.css";

// NOTE: 画像素材が不足しているため、既存の画像で代用しています。
// 仕様書にある表情（笑顔、驚き、困り顔）の画像が追加され次第、差し替える必要があります。
type Emotion = "normal" | "smile" | "surprise" | "sad" | "happy" | "gameover";

const emotionFiles: Record<Emotion, string> = {
  normal: "/images/characters/mama/mama-standing.png",
  smile: "/images/characters/mama/mama-banzai.png", // Placeholder
  surprise: "/images/characters/mama/mama-standing.png", // Placeholder
  sad: "/images/characters/mama/mama-standing.png", // Placeholder
  happy: "/images/characters/mama/mama-banzai.png",
  gameover: "/images/characters/mama/mama-standing.png",
};

const emotionMessages: Record<Emotion, string> = {
  normal: "いらっしゃい！ゆっくりしてってね。",
  smile: "うまいげんて！",
  surprise: "やるじぃ、ほんに！",
  sad: "ん〜、そいじゃないげんわ",
  happy: "ちょい吉のママもびっくりや！",
  gameover: "また寄ってってまっし〜",
};

export default function Mama() {
  const [emotion, setEmotion] = useState<Emotion>("normal");

  useEffect(() => {
    const handleMamaEmotion = (event: CustomEvent<Emotion>) => {
      // ゲームオーバー後の高スコアメッセージは少し遅れて表示
      if (event.detail === 'happy') {
        setTimeout(() => {
          setEmotion(event.detail);
        }, 1000);
      } else {
        setEmotion(event.detail);
      }
    };

    const eventName = "mamaEmotion";
    window.addEventListener(eventName, handleMamaEmotion as EventListener);

    return () => {
      window.removeEventListener(eventName, handleMamaEmotion as EventListener);
    };
  }, []);

  return (
    <div className={styles.mamaContainer}>
      <div className={styles.balloon}>
        <p>{emotionMessages[emotion]}</p>
      </div>
      <Image
        src={emotionFiles[emotion]}
        alt="ママ"
        width={200}
        height={300}
        className={styles.mamaImage}
        unoptimized // NOTE: Vercelの画像最適化を回避するため
      />
    </div>
  );
}