"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LEARNING_MILESTONES,
  MILESTONE_FREEZES,
  formatWeekOf,
  type FreezeOffer,
  type LearningMilestone,
} from "@umbil/shared";
import {
  markMilestonesCelebrated,
  uncelebratedMilestones,
} from "@/lib/milestoneCelebration";
import styles from "./LearningRewards.module.css";

const TIERS: Record<LearningMilestone, { name: string; emoji: string; className: string; pieces: number }> = {
  10: { name: "Bronze", emoji: "🥉", className: styles.bronze, pieces: 22 },
  25: { name: "Silver", emoji: "🥈", className: styles.silver, pieces: 28 },
  50: { name: "Gold", emoji: "🥇", className: styles.gold, pieces: 34 },
  100: { name: "Sapphire", emoji: "💎", className: styles.sapphire, pieces: 42 },
  200: { name: "Ruby", emoji: "♦️", className: styles.ruby, pieces: 52 },
  500: { name: "Phoenix", emoji: "🦅", className: styles.phoenix, pieces: 68 },
  1000: { name: "Mythic", emoji: "💫", className: styles.mythic, pieces: 88 },
};

const COLORS = ["#1fb8cd", "#f5c542", "#f97316", "#a855f7", "#34d399", "#fb7185", "#38bdf8", "#f43f5e"];

export const burstConfetti = (x: number, y: number, pieces = 28) => {
  if (typeof document === "undefined") return;
  for (let i = 0; i < pieces; i++) {
    const piece = document.createElement("span");
    piece.className = styles.confetti;
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * (180 + pieces))}px`);
    piece.style.setProperty("--dy", `${60 + Math.round(Math.random() * (120 + pieces))}px`);
    document.body.appendChild(piece);
    window.setTimeout(() => piece.remove(), 1100);
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
  streakFreezesEarned,
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
    setRetroMilestones(pending);
    burstConfetti(window.innerWidth / 2, window.innerHeight / 3, 48);
  }, [loading, unlockedMilestones]);

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
          const tier = TIERS[milestone];
          const freezes = MILESTONE_FREEZES[milestone];
          return (
            <button
              key={milestone}
              type="button"
              className={`${styles.trophy} ${tier.className} ${unlocked ? styles.unlocked : ""}`}
              disabled={!unlocked}
              aria-label={
                unlocked
                  ? `${tier.name} trophy, ${milestone} learning logs, ${freezes} streak freeze${freezes === 1 ? "" : "s"}`
                  : `${milestone} learning logs, locked, grants ${freezes} streak freeze${freezes === 1 ? "" : "s"}`
              }
              onClick={(event) => {
                if (!unlocked) return;
                const rect = event.currentTarget.getBoundingClientRect();
                burstConfetti(rect.left + rect.width / 2, rect.top, tier.pieces);
              }}
            >
              <span className={styles.icon} aria-hidden="true">{unlocked ? tier.emoji : "🔒"}</span>
              <span className={styles.count}>{milestone}</span>
              <span className={styles.unit}>logs</span>
              <span className={styles.name}>{tier.name}</span>
            </button>
          );
        })}
      </div>
      <p className={styles.freezeNote}>
        {nextMilestone
          ? `${totalLogs} learning logs. Next trophy at ${nextMilestone}.`
          : `${totalLogs} learning logs. All log trophies collected.`}
      </p>

      {offerCopy && (
        <div className={styles.freezeChoice}>
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
                <div key={milestone} className={`${styles.trophy} ${styles.unlocked} ${TIERS[milestone].className}`}>
                  <span className={styles.icon} aria-hidden="true">{TIERS[milestone].emoji}</span>
                  <span className={styles.count}>{milestone}</span>
                  <span className={styles.unit}>logs</span>
                  <span className={styles.name}>{TIERS[milestone].name}</span>
                </div>
              ))}
            </div>
            <h2 id="retro-trophy-title">
              {retroMilestones.length === 1
                ? `${retroMilestones[0]} learning logs`
                : `${retroMilestones[retroMilestones.length - 1]} learning logs`}
            </h2>
            <p>
              You already reached {retroMilestones.length === 1 ? "this trophy" : "these trophies"} with learning you logged before.
              {streakFreezesEarned === 1
                ? " It includes 1 streak freeze."
                : ` They include ${streakFreezesEarned} streak freezes.`}
              {" "}Nothing is used until you choose to protect a week.
            </p>
            <button type="button" className={styles.continue} onClick={closeRetro}>
              Collect
            </button>
          </div>
        </div>
      )}
    </>
  );
};
