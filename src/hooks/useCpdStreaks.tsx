"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { computeLearningStreaks, type LearningStreaks } from "@umbil/shared";
import { getCpdTimestamps } from "@/lib/store";
import { loadStreakFreezeWeeks, saveStreakFreezeWeek } from "@/lib/streakFreezes";
import { useUserEmail } from "./useUserEmail";

export type StreakData = LearningStreaks & {
  loading: boolean;
  refetch: () => Promise<void>;
  useStreakFreeze: (weekKey: string) => Promise<void>;
};

const StreakContext = createContext<StreakData | null>(null);

export const StreakProvider = ({ children }: { children: ReactNode }) => {
  const { email, loading: userLoading } = useUserEmail();
  const [cpdTimestamps, setCpdTimestamps] = useState<string[]>([]);
  const [appliedFreezes, setAppliedFreezes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const loadedForEmail = useRef<string | null>(null);

  const fetchCpdDates = useCallback(async () => {
    const id = ++requestId.current;
    if (userLoading) return;
    if (!email) {
      loadedForEmail.current = null;
      setCpdTimestamps([]);
      setAppliedFreezes([]);
      setLoading(false);
      return;
    }

    if (loadedForEmail.current !== email) setLoading(true);

    const [timestamps, freezes] = await Promise.all([
      getCpdTimestamps(),
      loadStreakFreezeWeeks().catch(() => [] as string[]),
    ]);
    if (id !== requestId.current) return;
    loadedForEmail.current = email;
    setCpdTimestamps(timestamps);
    setAppliedFreezes(freezes);
    setLoading(false);
  }, [email, userLoading]);

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

  const value = useMemo(
    () => ({ ...streaks, loading, refetch: fetchCpdDates, useStreakFreeze }),
    [streaks, loading, fetchCpdDates, useStreakFreeze]
  );

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
};

export function useCpdStreaks(): StreakData {
  const streaks = useContext(StreakContext);
  if (!streaks) {
    throw new Error("useCpdStreaks must be used within StreakProvider");
  }
  return streaks;
}
