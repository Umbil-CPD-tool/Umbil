// src/components/StreakPopup.tsx
"use client";

import { useEffect, useState } from "react";
import styles from "./StreakPopup.module.css";

type StreakPopupProps = {
  isOpen: boolean;
  streakCount: number;
  onClose: () => void;
};

export default function StreakPopup({ isOpen, streakCount, onClose }: StreakPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible && !isOpen) return null;

  // Days of week bubbles logic
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  // Calculate today's index (0 = Monday, 6 = Sunday to match 'days' array)
  // JS getDay() returns 0 for Sunday, 1 for Monday. We shift this.
  const jsDay = new Date().getDay(); 
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1; 

  return (
    <div className={`${styles.overlay} ${isOpen ? styles.open : ""}`}>
      <div className={styles.card}>
        
        {/* Fire Animation Area */}
        <div className={styles.iconContainer}>
          <div className="fire-glow"></div>
          <svg className={styles.fireIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="none"/>
            <path d="M13.5 3.5C13.5 3.5 16.5 6.5 16.5 10C16.5 12.5 15 14 14 15C15.5 15 17 13.5 17 12C17 15.5 15 18.5 12 18.5C9 18.5 8 15.5 8 13.5C8 12 9 10.5 10 10C9.5 10.5 8.5 12 8.5 13.5C8.5 11.5 10 8.5 12 6C12.5 8 13.5 9 14 9C13 7 12 5.5 13.5 3.5Z" fill="#FF9600" stroke="#FF9600" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className={styles.number}>{streakCount}</div>
        </div>

        <h2 className={styles.title}>{streakCount} Day Streak!</h2>
        <p className={styles.desc}>
          You&apos;re on fire! 🔥 <br/>
          Consistency is key to clinical excellence.
        </p>

        {/* Days Row */}
        <div className={styles.daysRow}>
          {days.map((d, i) => {
            // Logic: Highlighting rule
            // "diff" is how many days ago this bubble was, relative to today.
            // i=todayIndex -> diff=0. i=yesterday -> diff=1.
            const diff = todayIndex - i; 
            
            // It is active if:
            // 1. It is today or a past day in this week (diff >= 0)
            // 2. The streak covers this day (diff < streakCount)
            const isActive = diff >= 0 && diff < streakCount;

            return (
              <div key={i} className={`${styles.dayBubble} ${isActive ? styles.active : ''}`}>
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