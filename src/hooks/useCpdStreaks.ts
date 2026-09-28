// src/hooks/useCpdStreaks.ts
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { computeLearningStreaks, type LearningStreaks } from "@umbil/shared";
import { getCPD } from "@/lib/store";
import { loadStreakFreezeWeeks, saveStreakFreezeWeek } from "@/lib/streakFreezes";
import { useUserEmail } from "./useUserEmail";

export type StreakData = LearningStreaks & {
  loading: boolean;
  refetch: () => Promise<void>;
  useStreakFreeze: (weekKey: string) => Promise<void>;
};

export function useCpdStreaks(): StreakData {
  const { email, loading: userLoading } = useUserEmail();
  const [cpdTimestamps, setCpdTimestamps] = useState<string[]>([]);
  const [appliedFreezes, setAppliedFreezes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCpdDates = useCallback(async () => {
    if (userLoading || !email) {
      setLoading(false);
      return;
    }

    const [entries, freezes] = await Promise.all([
      getCPD(),
      loadStreakFreezeWeeks().catch(() => [] as string[]),
    ]);
    setCpdTimestamps(entries.map(e => e.timestamp));
    setAppliedFreezes(freezes);
    setLoading(false);
  }, [email, userLoading]);

  useEffect(() => {
    fetchCpdDates();
  }, [fetchCpdDates]);

  const streaks = useMemo(
    () => computeLearningStreaks(cpdTimestamps, new Date(), appliedFreezes),
    [cpdTimestamps, appliedFreezes]
  );

  const useStreakFreeze = useCallback(async (weekKey: string) => {
    const next = await saveStreakFreezeWeek(weekKey, appliedFreezes);
    setAppliedFreezes(next);
  }, [appliedFreezes]);

  return { ...streaks, loading, refetch: fetchCpdDates, useStreakFreeze };
}
