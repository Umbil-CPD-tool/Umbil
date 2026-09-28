import { useCallback, useEffect, useMemo, useState } from "react";
import { computeLearningStreaks, type LearningMilestone } from "@umbil/shared";

import { useAuth } from "@/providers/AuthProvider";
import { getCPD } from "@/lib/store/cpd";

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

/** Weekly learning streak from CPD logs. Shared math with the web hook. */
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

  const streaks = useMemo(
    () => computeLearningStreaks(cpdTimestamps),
    [cpdTimestamps]
  );

  return { ...streaks, loading, refetch: fetchCpdDates };
};
