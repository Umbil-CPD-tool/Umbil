import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/providers/AuthProvider";
import { getCPD } from "@/lib/store/cpd";

export type StreakData = {
  dates: Map<string, number>;
  currentStreak: number;
  longestStreak: number;
  loading: boolean;
  hasLoggedToday: boolean;
  refetch: () => Promise<void>;
};

/** Port of web `src/hooks/useCpdStreaks.ts` for Expo. */
export const useCpdStreaks = (): StreakData => {
  const { user } = useAuth();
  const [cpdTimestamps, setCpdTimestamps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCpdDates = useCallback(async () => {
    if (!user) {
      setCpdTimestamps([]);
      setLoading(false);
      return;
    }
    const entries = await getCPD();
    setCpdTimestamps(entries.map((e) => e.timestamp));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchCpdDates();
  }, [fetchCpdDates]);

  const { dates, currentStreak, longestStreak, hasLoggedToday } = useMemo(() => {
    const toDateString = (date: Date): string =>
      date.toISOString().split("T")[0];

    const dateCounts = new Map<string, number>();
    for (const ts of cpdTimestamps) {
      const dateStr = toDateString(new Date(ts));
      dateCounts.set(dateStr, (dateCounts.get(dateStr) || 0) + 1);
    }

    const loggedDatesSet = new Set(dateCounts.keys());

    if (loggedDatesSet.size === 0) {
      return {
        dates: dateCounts,
        currentStreak: 0,
        longestStreak: 0,
        hasLoggedToday: false,
      };
    }

    let currentStreakCount = 0;
    let longestStreakCount = 0;
    let tempStreakCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = toDateString(today);
    const loggedToday = loggedDatesSet.has(todayStr);

    const checkDate = new Date(today);
    let isCurrentStreak = true;

    for (let i = 0; i < 365; i++) {
      const dateStr = toDateString(checkDate);

      if (loggedDatesSet.has(dateStr)) {
        tempStreakCount++;
      } else {
        if (isCurrentStreak) {
          if (i === 0 && !loggedToday) {
            currentStreakCount = 0;
          } else if (isCurrentStreak) {
            currentStreakCount = tempStreakCount;
          }
          isCurrentStreak = false;
        }
        longestStreakCount = Math.max(longestStreakCount, tempStreakCount);
        tempStreakCount = 0;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    if (isCurrentStreak) {
      currentStreakCount = tempStreakCount;
    }
    longestStreakCount = Math.max(longestStreakCount, tempStreakCount);

    return {
      dates: dateCounts,
      currentStreak: currentStreakCount,
      longestStreak: longestStreakCount,
      hasLoggedToday: loggedToday,
    };
  }, [cpdTimestamps]);

  return {
    dates,
    currentStreak,
    longestStreak,
    loading,
    hasLoggedToday,
    refetch: fetchCpdDates,
  };
};
