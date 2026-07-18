"use client";

import { X, CalendarDays } from "lucide-react";
import { useEffect } from "react";
import WeeklySummaryCard from "@/components/WeeklySummaryCard";
import type { WeeklySummaryData } from "@/lib/weeklySummary";

type WeeklySummaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  summary: WeeklySummaryData | null;
  loading?: boolean;
  /** When true, closing still calls onClose but parent should skip POST dismiss. */
  preview?: boolean;
};

export default function WeeklySummaryModal({
  isOpen,
  onClose,
  summary,
  loading = false,
  preview = false,
}: WeeklySummaryModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.55)" }}
    >
      <div
        className="rounded-3xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--umbil-surface)",
          color: "var(--umbil-text)",
          border: "1px solid var(--umbil-card-border)",
          boxShadow: "var(--umbil-shadow-lg)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition-colors z-10"
          style={{
            color: "var(--umbil-muted)",
            backgroundColor: "var(--umbil-hover-bg)",
          }}
          aria-label="Close weekly summary"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pt-10">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "rgba(31, 184, 205, 0.15)" }}
          >
            <CalendarDays className="w-8 h-8" style={{ color: "var(--umbil-brand-teal)" }} />
          </div>

          <h3
            className="text-2xl font-bold mb-2 text-center"
            style={{ color: "var(--umbil-text)" }}
          >
            Your week on Umbil
          </h3>
          {preview && (
            <p
              className="text-center text-sm mb-4"
              style={{ color: "var(--umbil-muted)" }}
            >
              Preview — closing won&apos;t mark this week as seen
            </p>
          )}

          <div className="text-left" style={{ color: "var(--umbil-text)" }}>
            <WeeklySummaryCard
              summary={summary}
              loading={loading}
              compact
              showActions
            />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-6 py-3.5 px-4 rounded-xl font-bold text-lg transition-all"
            style={{
              backgroundColor: "var(--umbil-brand-teal)",
              color: "#ffffff",
              boxShadow: "0 8px 20px rgba(31, 184, 205, 0.25)",
            }}
          >
            {preview ? "Close preview" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
