"use client";

import { useEffect, useMemo, useState } from "react";
import { useUserEmail } from "@/hooks/useUserEmail";
import { useCpdStreaks } from "@/hooks/useCpdStreaks";
import { toLocalDateKey, formatWeekStreak, type FreezeOffer, type LearningMilestone } from "@umbil/shared";
import { LearningRewards } from "@/components/profile/LearningRewards";
import Toast from "@/components/Toast";
import WeeklySummaryCard from "@/components/weekly-summary/WeeklySummaryCard";
import WeeklySummaryModal from "@/components/weekly-summary/WeeklySummaryModal";
import { supabase } from "@/lib/supabase";
import type { WeeklySummaryData } from "@/lib/weekly-summary";

const getLastYearDates = () => {
    const dates: { date: Date; dateStr: string; isFiller: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const cursorDate = new Date(today);
    
    for (let i = 0; i < 364; i++) {
        const dateStr = toLocalDateKey(cursorDate);
        dates.unshift({ date: new Date(cursorDate), dateStr, isFiller: false });
        cursorDate.setDate(cursorDate.getDate() - 1);
    }
    return dates;
};

type StreakCalendarProps = {
    loggedDates: Map<string, number>;
    loggedWeekKeys: string[];
    freezeWeekKeys: string[];
    currentStreak: number;
    longestStreak: number;
    totalLogs: number;
    unlockedMilestones: LearningMilestone[];
    nextMilestone: LearningMilestone | null;
    streakFreezesEarned: number;
    streakFreezesAvailable: number;
    freezeOffer: FreezeOffer | null;
    onUseFreeze: (weekKey: string) => Promise<void>;
    loading: boolean;
    setToastMessage: (message: string) => void;
}

const StreakCalendar = ({ loggedDates, currentStreak, longestStreak, totalLogs, unlockedMilestones, nextMilestone, streakFreezesEarned, streakFreezesAvailable, freezeOffer, onUseFreeze, loading, setToastMessage }: StreakCalendarProps) => { 
    const calendarDates = useMemo(getLastYearDates, []);
    const todayStr = toLocalDateKey(new Date());
    const weekColumns = useMemo(() => {
        const cells: ({ date: Date; dateStr: string } | null)[] = [];
        const first = calendarDates[0];
        if (!first) return [];
        const firstMondayIndex = (first.date.getDay() + 6) % 7;
        for (let i = 0; i < firstMondayIndex; i++) cells.push(null);
        for (const entry of calendarDates) cells.push(entry);
        while (cells.length % 7 !== 0) cells.push(null);
        const columns: ({ date: Date; dateStr: string } | null)[][] = [];
        for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
        return columns;
    }, [calendarDates]);

    const handleShareStreak = async () => {
        const shareText = `🔥 ${formatWeekStreak(currentStreak)} streak! I'm using Umbil to capture clinical learning. You should check it out: https://umbil.co.uk`;

        if (navigator.share) {
            try {
                await navigator.share({ title: "My Umbil Streak!", text: shareText });
            } catch (err) {
                console.log("Share API error or cancelled:", err);
            }
        } else {
            navigator.clipboard.writeText(shareText)
                .then(() => setToastMessage("Streak details copied to clipboard!"))
                .catch(err => setToastMessage("❌ Failed to copy text."));
        }
    };

    if (loading) return <p>Loading learning history...</p>;
    
    const getShadeLevel = (count: number) => {
        if (count === 0) return 0;
        if (count >= 6) return 4;
        if (count >= 4) return 3;
        if (count >= 2) return 2;
        return 1; 
    }

    return (
        <div className="card" style={{ marginBottom: 24, padding: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: 16, fontSize: '1rem' }}>
                <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                        Current Streak: <span style={{ color: 'var(--umbil-brand-teal)' }}>{formatWeekStreak(currentStreak)} 🔥</span>
                    </div>
                    <div style={{ color: 'var(--umbil-muted)', fontSize: '0.9rem' }}>
                        Longest Streak: {formatWeekStreak(longestStreak)}
                    </div>
                    <div style={{ color: 'var(--umbil-muted)', fontSize: '0.9rem', marginTop: 6, maxWidth: 520, lineHeight: 1.45 }}>
                        A streak counts weeks in a row with at least one learning log. One log in a week is enough.
                    </div>
                </div>
                {currentStreak > 0 && (
                    <button className="btn btn--outline" onClick={handleShareStreak} style={{ padding: '8px 12px', fontSize: '0.9rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                        Share Streak
                    </button>
                )}
            </div>

            <LearningRewards
                totalLogs={totalLogs}
                unlockedMilestones={unlockedMilestones}
                nextMilestone={nextMilestone}
                streakFreezesEarned={streakFreezesEarned}
                streakFreezesAvailable={streakFreezesAvailable}
                freezeOffer={freezeOffer}
                onUseFreeze={onUseFreeze}
                loading={false}
            />
            
            <div className="calendar-scroll-wrap">
                <div className="day-labels-column">
                    {["M", "", "W", "", "F", "", ""].map((label, index) => (
                        <div key={index} className="day-label-item">
                            {label}
                        </div>
                    ))}
                </div>
                <div className="calendar-grid-container" aria-label="Learning history by week">
                <div className="calendar-month-row">
                    {weekColumns.map((column, columnIndex) => {
                        const days = column.filter((cell): cell is { date: Date; dateStr: string } => cell !== null);
                        const firstOfMonth = days.find((cell) => cell.date.getDate() === 1);
                        const label = firstOfMonth
                            ? firstOfMonth.date.toLocaleDateString("en-GB", { month: "short" })
                            : columnIndex === 0 && days[0]
                              ? days[0].date.toLocaleDateString("en-GB", { month: "short" })
                              : "";
                        return (
                            <div key={columnIndex} className="calendar-month-cell">
                                {label ? <span className="calendar-month-label">{label}</span> : null}
                            </div>
                        );
                    })}
                </div>
                <div className="calendar-weeks">
                    {weekColumns.map((column, columnIndex) => (
                            <div key={columnIndex} className="calendar-week-col">
                                {column.map((cell, cellIndex) => {
                                    if (!cell) {
                                        return <div key={cellIndex} className="calendar-square is-empty" />;
                                    }
                                    const count = loggedDates.get(cell.dateStr) || 0;
                                    const level = getShadeLevel(count);
                                    const isToday = cell.dateStr === todayStr;
                                    return (
                                        <div
                                            key={cell.dateStr}
                                            className={`calendar-square level-${level} ${isToday ? "is-today" : ""}`}
                                            title={`${cell.dateStr}: ${count} ${count === 1 ? "log" : "logs"}`}
                                            data-date={cell.dateStr}
                                        />
                                    );
                                })}
                            </div>
                    ))}
                </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, fontSize: '0.8rem', marginTop: 12 }}>
                <span style={{ color: 'var(--umbil-muted)' }}>Less</span>
                <span className="color-legend level-0"></span>
                <span className="color-legend level-1"></span>
                <span className="color-legend level-2"></span>
                <span className="color-legend level-3"></span>
                <span className="color-legend level-4"></span>
                <span style={{ color: 'var(--umbil-muted)' }}>More</span>
            </div>
        </div>
    );
}

export const LearningStreakSection = () => {
  const { email } = useUserEmail();
  const streaks = useCpdStreaks();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummaryData | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [showWeeklyPreview, setShowWeeklyPreview] = useState(false);

  useEffect(() => {
    if (!email) return;
    const loadWeeklySummary = async () => {
      setWeeklyLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setWeeklySummary(null);
          return;
        }
        const res = await fetch("/api/user/weekly-summary", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          setWeeklySummary(null);
          return;
        }
        setWeeklySummary((await res.json()) as WeeklySummaryData);
      } catch {
        setWeeklySummary(null);
      } finally {
        setWeeklyLoading(false);
      }
    };
    void loadWeeklySummary();
  }, [email]);

  return (
    <>
      <StreakCalendar
        loggedDates={streaks.dates}
        loggedWeekKeys={streaks.loggedWeekKeys}
        freezeWeekKeys={streaks.freezeWeekKeys}
        currentStreak={streaks.currentStreak}
        longestStreak={streaks.longestStreak}
        totalLogs={streaks.totalLogs}
        unlockedMilestones={streaks.unlockedMilestones}
        nextMilestone={streaks.nextMilestone}
        streakFreezesEarned={streaks.streakFreezesEarned}
        streakFreezesAvailable={streaks.streakFreezesAvailable}
        freezeOffer={streaks.freezeOffer}
        onUseFreeze={streaks.useStreakFreeze}
        loading={streaks.loading}
        setToastMessage={setToastMessage}
      />
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card__body">
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Weekly Summary</h3>
            <button
              type="button"
              className="btn btn--outline"
              style={{ padding: "8px 12px", fontSize: "0.9rem" }}
              onClick={() => setShowWeeklyPreview(true)}
              disabled={weeklyLoading || !weeklySummary}
            >
              Preview popup
            </button>
          </div>
          <WeeklySummaryCard summary={weeklySummary} loading={weeklyLoading} showActions />
        </div>
      </div>
      <WeeklySummaryModal
        isOpen={showWeeklyPreview}
        onClose={() => setShowWeeklyPreview(false)}
        summary={weeklySummary}
        loading={weeklyLoading}
        preview
      />
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </>
  );
};
