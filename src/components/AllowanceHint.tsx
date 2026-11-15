"use client";

import { useEffect, useState } from "react";
import { allowanceHint, type AllowanceKind } from "@umbil/shared";
import { supabase } from "@/lib/supabase";

export type AllowanceTransition = {
  offer: "student" | "clinician";
  accessUntil: string;
  endsLabel: string;
};

export type AllowanceSnapshot = {
  unlimited: boolean;
  questions: { used: number; limit: number; remaining: number };
  tools: { used: number; limit: number; remaining: number };
  cpd: { used: number; limit: number; remaining: number };
  transition: AllowanceTransition | null;
};

let snapshot: AllowanceSnapshot | null = null;
let inflight: Promise<AllowanceSnapshot | null> | null = null;

const loadAllowance = async (): Promise<AllowanceSnapshot | null> => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  const response = await fetch("/api/usage/allowance", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as AllowanceSnapshot;
};

export const notifyUsageChanged = () => {
  snapshot = null;
  inflight = null;
  window.dispatchEvent(new Event("umbil-usage-changed"));
};

export const useAllowance = () => {
  const [data, setData] = useState<AllowanceSnapshot | null>(snapshot);

  useEffect(() => {
    let active = true;
    const pull = () => {
      const request = inflight ?? loadAllowance();
      inflight = request;
      void request
        .then((next) => {
          if (inflight === request) inflight = null;
          snapshot = next;
          if (active) setData(next);
        })
        .catch(() => {
          if (inflight === request) inflight = null;
        });
    };

    pull();
    const onChange = () => {
      snapshot = null;
      inflight = null;
      pull();
    };
    window.addEventListener("umbil-usage-changed", onChange);
    return () => {
      active = false;
      window.removeEventListener("umbil-usage-changed", onChange);
    };
  }, []);

  return data;
};

type AllowanceHintProps = {
  kind: AllowanceKind;
  align?: "center" | "left";
};

export const AllowanceHint = ({ kind, align = "center" }: AllowanceHintProps) => {
  const data = useAllowance();
  if (!data || data.unlimited) return null;
  return (
    <p
      className={`text-xs text-[var(--umbil-muted)] ${align === "center" ? "text-center" : "text-left"}`}
      style={{ marginTop: 8, marginBottom: 0 }}
      aria-live="polite"
    >
      {allowanceHint(kind, data[kind].remaining)}
    </p>
  );
};
