"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import styles from "./MasakiPopup.module.css";
import { asset } from "@/lib/assets";

export default function MasakiPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMasakiPopup = () => {
      setIsVisible(true);
      // 5秒後に非表示
      setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    };

    const eventName = "masakiPopup";
    window.addEventListener(eventName, handleMasakiPopup as EventListener);

    return () => {
      window.removeEventListener(eventName, handleMasakiPopup as EventListener);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className={styles.masakiContainer}>
      <div className={styles.balloon}>
        <p>すげぇじゃん！</p>
      </div>
      <Image
        src={asset("/images/characters/masaki/masaki-stand.png")}
        alt="まさき"
        width={150}
        height={200}
        className={styles.masakiImage}
        unoptimized
      />
    </div>
  );
}