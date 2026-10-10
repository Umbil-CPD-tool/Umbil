// src/components/StreakPopup.tsx
"use client";

import { useEffect, useState } from "react";
import { activeDaysThisWeek, weekLabel } from "@umbil/shared";
import { useCpdStreaks } from "@/hooks/useCpdStreaks";
import { markMilestonesCelebrated } from "@/lib/milestoneCelebration";
import { celebrateUmbil } from "@/components/profile/LearningRewards";
import styles from "./StreakPopup.module.css";

type StreakPopupProps = {
  isOpen: boolean;
  streakCount: number;
  milestone?: number | null;
  onClose: () => void;
};

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function StreakPopup({ isOpen, streakCount, milestone = null, onClose }: StreakPopupProps) {
  const [visible, setVisible] = useState(false);
  const { dates } = useCpdStreaks();

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      celebrateUmbil();
      if (milestone) markMilestonesCelebrated([milestone]);
    } else {
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, milestone]);

  if (!visible && !isOpen) return null;

  const jsDay = new Date().getDay();
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const activeDays = activeDaysThisWeek(dates.keys(), new Date(), new Date());
  const weekWord = weekLabel(streakCount);

  return (
    <div className={`${styles.overlay} ${isOpen ? styles.open : ""}`}>
      <div className={styles.card}>
        <div className={styles.iconContainer}>
          <div className="fire-glow"></div>
          <svg className={styles.fireIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="none"/>
            <path d="M13.5 3.5C13.5 3.5 16.5 6.5 16.5 10C16.5 12.5 15 14 14 15C15.5 15 17 13.5 17 12C17 15.5 15 18.5 12 18.5C9 18.5 8 15.5 8 13.5C8 12 9 10.5 10 10C9.5 10.5 8.5 12 8.5 13.5C8.5 11.5 10 8.5 12 6C12.5 8 13.5 9 14 9C13 7 12 5.5 13.5 3.5Z" fill="#FF9600" stroke="#FF9600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className={styles.number}>{streakCount}</div>
        </div>

        <h2 className={styles.title}>{streakCount} {weekWord === "week" ? "Week" : "Weeks"} Streak!</h2>
        {milestone ? (
          <div className={styles.trophy}>
            <span className={styles.trophyIcon} aria-hidden="true">🏆</span>
            <p className={styles.trophyText}>Well done for logging your learning {milestone} times.</p>
          </div>
        ) : null}
        <p className={styles.desc}>
          You&apos;re on fire! 🔥 <br/>
          One learning log a week keeps this going.
        </p>

        <div className={styles.daysRow}>
          {DAYS.map((d, i) => {
            const isActive = activeDays[i];
            return (
              <div key={i} className={`${styles.dayBubble} ${isActive ? styles.active : ""}`}>
                {d}
                {i === todayIndex && <div className={styles.checkMark}>✓</div>}
              </div>
            );
          })}
        </div>

        <button className={styles.continueBtn} onClick={onClose}>
          CONTINUE
        </button>
      </div>
    </div>
  );
}
