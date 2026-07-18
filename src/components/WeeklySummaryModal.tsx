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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors z-10"
          aria-label="Close weekly summary"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pt-10">
          <div className="w-16 h-16 bg-[#33e1ff]/20 dark:bg-[#33e1ff]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CalendarDays className="w-8 h-8 text-[#33e1ff]" />
          </div>

          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">
            Your week on Umbil
          </h3>
          {preview && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
              Preview — closing won&apos;t mark this week as seen
            </p>
          )}

          <div className="text-left text-gray-700 dark:text-gray-200">
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
            className="w-full mt-6 py-3.5 px-4 bg-[#33e1ff] hover:bg-[#33e1ff]/90 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-[#33e1ff]/30 dark:shadow-none"
          >
            {preview ? "Close preview" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
