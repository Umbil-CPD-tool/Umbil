"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/hooks/useUserEmail";
import { StreakProvider } from "@/hooks/useCpdStreaks";

export const AppSessionProvider = ({ children }: { children: ReactNode }) => (
  <SessionProvider>
    <StreakProvider>{children}</StreakProvider>
  </SessionProvider>
);
