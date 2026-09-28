// src/hooks/useCpdStreaks.ts
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { computeLearningStreaks, type LearningMilestone } from "@umbil/shared";
import { getCPD } from "@/lib/store";
import { useUserEmail } from "./useUserEmail";

export type StreakData = {
  dates: Map<string, number>;
  currentStreak: number;
  longestStreak: number;
  loading: boolean;
  hasLoggedThisWeek: boolean;
  logsThisWeek: number;
  totalLogs: number;
  unlockedMilestones: LearningMilestone[];
  nextMilestone: LearningMilestone | null;
  refetch: () => Promise<void>;
};

export function useCpdStreaks(): StreakData {
  const { email, loading: userLoading } = useUserEmail();
  const [cpdTimestamps, setCpdTimestamps] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCpdDates = useCallback(async () => {
    if (userLoading || !email) {
      setLoading(false);
      return;
    }

    const entries = await getCPD();
    const timestamps = entries.map(e => e.timestamp);
    setCpdTimestamps(timestamps);
    setLoading(false);
  }, [email, userLoading]);

  useEffect(() => {
    fetchCpdDates();
  }, [fetchCpdDates]);

  const streaks = useMemo(
    () => computeLearningStreaks(cpdTimestamps),
    [cpdTimestamps]
  );

  return { ...streaks, loading, refetch: fetchCpdDates };
}
