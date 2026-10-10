import { useCallback, useEffect, useMemo, useState } from "react";
import { computeLearningStreaks, type LearningStreaks } from "@umbil/shared";

import { loadStreakFreezeWeeks, saveStreakFreezeWeek } from "@/lib/streakFreezes";
import { useAuth } from "@/providers/AuthProvider";
import { getCpdTimestamps } from "@/lib/store/cpd";

export type StreakData = LearningStreaks & {
  loading: boolean;
  refetch: () => Promise<void>;
  useStreakFreeze: (weekKey: string) => Promise<void>;
};

/** Weekly learning streak from CPD logs. Shared math with the web hook. */
export const useCpdStreaks = (): StreakData => {
  const { user } = useAuth();
  const [cpdTimestamps, setCpdTimestamps] = useState<string[]>([]);
  const [appliedFreezes, setAppliedFreezes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCpdDates = useCallback(async () => {
    if (!user) {
      setCpdTimestamps([]);
      setAppliedFreezes([]);
      setLoading(false);
      return;
    }
    const [timestamps, freezes] = await Promise.all([
      getCpdTimestamps(),
      loadStreakFreezeWeeks().catch(() => [] as string[]),
    ]);
    setCpdTimestamps(timestamps);
    setAppliedFreezes(freezes);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchCpdDates();
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
};
