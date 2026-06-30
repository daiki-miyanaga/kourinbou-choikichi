"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./Mama.module.css";
import { asset } from "@/lib/assets";

// NOTE: 画像素材が不足しているため、既存の画像で代用しています。
// 仕様書にある表情（笑顔、驚き、困り顔）の画像が追加され次第、差し替える必要があります。
type Emotion = "normal" | "smile" | "surprise" | "sad" | "happy" | "gameover" | "fever";

const emotionFiles: Record<Emotion, string> = {
  normal: "/images/characters/mama/mama-standing.png",
  smile: "/images/characters/mama/mama-banzai.png",
  surprise: "/images/characters/mama/mama-left.png", // 左向きで驚きを表現
  sad: "/images/characters/mama/mama-standing.png",
  happy: "/images/characters/mama/mama-banzai.png",
  gameover: "/images/characters/mama/mama-standing.png",
  fever: "/images/characters/mama/mama-banzai.png",
};

const emotionMessages: Record<Emotion, string[]> = {
  normal: [
    "いらっしゃい！ゆっくりしてってね。",
    "今日もええ感じやね〜。",
    "おつまみ、ようけあるよ〜。",
  ],
  smile: ["うまいげんて！✨", "ええ調子やわ〜♪", "おいしいとこ突くじぃ！"],
  surprise: ["やるじぃ、ほんに！😲", "連鎖しとるが！すごいじぃ！", "あんやと〜！盛り上がっとる！"],
  sad: ["ん〜、そいじゃないげんわ💦", "おっと、ちょっこし違うわ〜", "あせらんと、ゆっくりまっし。"],
  happy: ["ちょい吉のママもびっくりや！🎉", "今日いちばんのお客さんや！🎉"],
  gameover: ["また寄ってってまっし〜👋", "おつかれさま！また来まっし〜👋"],
  fever: ["盛り上がっとるぞいね！🔥", "フィーバーやよ！いくまっし〜！🔥"],
};

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];

// 一定時間で通常表情に戻す（リザルト系の表情は維持）
const transientEmotions: Emotion[] = ["smile", "surprise", "sad", "fever"];

export default function Mama() {
  const [emotion, setEmotion] = useState<Emotion>("normal");
  const [message, setMessage] = useState(emotionMessages.normal[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const applyEmotion = (next: Emotion) => {
      setEmotion(next);
      setMessage(pick(emotionMessages[next]));
      setIsAnimating(true);
      if (animTimer.current) clearTimeout(animTimer.current);
      animTimer.current = setTimeout(() => setIsAnimating(false), 600);

      if (revertTimer.current) clearTimeout(revertTimer.current);
      if (transientEmotions.includes(next)) {
        revertTimer.current = setTimeout(() => {
          setEmotion("normal");
          setMessage(pick(emotionMessages.normal));
        }, 4000);
      }
    };

    const handleMamaEmotion = (event: CustomEvent<Emotion>) => {
      // ゲームオーバー後の高スコアメッセージは少し遅れて表示
      if (event.detail === "happy") {
        setTimeout(() => applyEmotion("happy"), 1000);
      } else {
        applyEmotion(event.detail);
      }
    };

    window.addEventListener("mamaEmotion", handleMamaEmotion as EventListener);
    return () => {
      window.removeEventListener("mamaEmotion", handleMamaEmotion as EventListener);
      if (revertTimer.current) clearTimeout(revertTimer.current);
      if (animTimer.current) clearTimeout(animTimer.current);
    };
  }, []);

  return (
    <div className={styles.mamaContainer}>
      <div className={`${styles.balloon} ${isAnimating ? styles.balloonPop : ""}`}>
        <p>{message}</p>
      </div>
      <Image
        src={asset(emotionFiles[emotion])}
        alt="ママ"
        width={200}
        height={300}
        className={`${styles.mamaImage} ${isAnimating ? styles.bounce : ""}`}
        unoptimized
      />
    </div>
  );
}
