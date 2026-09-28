"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LEARNING_MILESTONES,
  formatWeekOf,
  type FreezeOffer,
  type LearningMilestone,
} from "@umbil/shared";
import {
  markMilestonesCelebrated,
  uncelebratedMilestones,
} from "@/lib/milestoneCelebration";
import styles from "./LearningRewards.module.css";

const COLORS = ["#1fb8cd", "#f5c542", "#f97316", "#a855f7", "#34d399", "#fb7185", "#38bdf8", "#f43f5e"];

export const burstConfetti = (x: number, y: number, pieces = 28) => {
  if (typeof document === "undefined") return;
  for (let i = 0; i < pieces; i++) {
    const piece = document.createElement("span");
    piece.className = styles.confetti;
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * (220 + pieces))}px`);
    piece.style.setProperty("--dy", `${280 + Math.round(Math.random() * 420)}px`);
    document.body.appendChild(piece);
    window.setTimeout(() => piece.remove(), 1900);
  }
};

type Props = {
  totalLogs: number;
  unlockedMilestones: LearningMilestone[];
  nextMilestone: LearningMilestone | null;
  streakFreezesEarned: number;
  streakFreezesAvailable: number;
  freezeOffer: FreezeOffer | null;
  onUseFreeze: (weekKey: string) => Promise<void>;
  loading: boolean;
};

export const LearningRewards = ({
  totalLogs,
  unlockedMilestones,
  nextMilestone,
  streakFreezesAvailable,
  freezeOffer,
  onUseFreeze,
  loading,
}: Props) => {
  const [retroMilestones, setRetroMilestones] = useState<LearningMilestone[]>([]);
  const [spending, setSpending] = useState(false);
  const [spendError, setSpendError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const pending = uncelebratedMilestones(unlockedMilestones);
    if (pending.length === 0) return;
    setRetroMilestones((current) => {
      const nextKey = pending.join(",");
      return current.join(",") === nextKey ? current : pending;
    });
  }, [loading, unlockedMilestones]);

  useEffect(() => {
    if (retroMilestones.length === 0) return;
    const width = window.innerWidth;
    const top = Math.max(72, window.innerHeight * 0.16);
    const timers = [0, 280, 560].map((delay) =>
      window.setTimeout(() => {
        burstConfetti(width * 0.28, top, 26);
        burstConfetti(width * 0.5, top, 32);
        burstConfetti(width * 0.72, top, 26);
      }, delay)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [retroMilestones.join(",")]);

  if (loading) return null;

  const closeRetro = () => {
    markMilestonesCelebrated(retroMilestones);
    setRetroMilestones([]);
  };

  const spendFreeze = async () => {
    if (!freezeOffer || spending) return;
    setSpending(true);
    setSpendError(null);
    try {
      await onUseFreeze(freezeOffer.weekKey);
    } catch (error) {
      setSpendError(error instanceof Error ? error.message : "Could not use that freeze.");
    } finally {
      setSpending(false);
    }
  };

  const freezeLabel = streakFreezesAvailable === 1 ? "1 streak freeze" : `${streakFreezesAvailable} streak freezes`;
  const offerCopy = freezeOffer?.reason === "open-week"
    ? "this week open"
    : freezeOffer
      ? `${formatWeekOf(freezeOffer.weekKey)} missed`
      : null;

  return (
    <>
      <div className={styles.row}>
        {LEARNING_MILESTONES.map((milestone) => {
          const unlocked = unlockedMilestones.includes(milestone);
          return (
            <button
              key={milestone}
              type="button"
              className={`${styles.mark} ${unlocked ? styles.markOn : ""}`}
              disabled={!unlocked}
              aria-label={unlocked ? `${milestone} learning logs, reached` : `${milestone} learning logs, not yet`}
              onClick={(event) => {
                if (!unlocked) return;
                const rect = event.currentTarget.getBoundingClientRect();
                burstConfetti(rect.left + rect.width / 2, rect.top, 18);
              }}
            >
              {milestone}
            </button>
          );
        })}
      </div>
      <p className={styles.freezeNote}>
        {nextMilestone
          ? `${totalLogs} learning logs. Next at ${nextMilestone}.`
          : `${totalLogs} learning logs. All log trophies collected.`}
      </p>

      {offerCopy && (
        <div className={styles.freezeChoice}>
          <span className={styles.freezeMark} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 2v20M4.9 6.5l14.2 11M19.1 6.5L4.9 17.5" />
              <path d="M8 5.2l4 2.3 4-2.3M8 18.8l4-2.3 4 2.3M5.2 9.5L8 12l-2.8 2.5M18.8 9.5L16 12l2.8 2.5" />
            </svg>
          </span>
          <span>
            {freezeLabel} · {offerCopy}
          </span>
          <button type="button" className={styles.useFreeze} onClick={() => void spendFreeze()} disabled={spending}>
            {spending ? "…" : "Use 1"}
          </button>
          <Link href="/capture-learning" className={styles.logLink}>
            Log
          </Link>
          {spendError && <span className={styles.spendError}>{spendError}</span>}
        </div>
      )}

      {retroMilestones.length > 0 && (
        <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="retro-trophy-title">
          <div className={styles.modal}>
            <div className={styles.row} style={{ justifyContent: "center" }}>
              {retroMilestones.map((milestone) => (
                <div key={milestone} className={`${styles.mark} ${styles.markOn}`}>
                  {milestone}
                </div>
              ))}
            </div>
            <h2 id="retro-trophy-title">Well done</h2>
            <p>
              You have logged your learning {retroMilestones[retroMilestones.length - 1]} times.
              These awards are for learning you saved before today.
              {streakFreezesAvailable === 0
                ? ""
                : streakFreezesAvailable === 1
                  ? " You also have 1 spare week. If you miss a week, you can use it so your streak continues. It is only used if you choose."
                  : ` You also have ${streakFreezesAvailable} spare weeks. If you miss a week, you can use one so your streak continues. They are only used if you choose.`}
            </p>
            <button type="button" className={styles.continue} onClick={closeRetro}>
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
};
