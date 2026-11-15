// src/components/ProUpgradeModal.tsx
"use client";

import { X, Sparkles, CheckCircle2 } from "lucide-react";
import { StudentProNote } from "@/components/StudentProNote";
import { trackFunnelEvent } from "@/lib/analytics/trackFunnelClient";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ProUpgradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
};

export default function ProUpgradeModal({ isOpen, onClose, featureName }: ProUpgradeModalProps) {
  const router = useRouter();

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    trackFunnelEvent("pricing_viewed", { source: "upgrade_modal" });
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-[var(--umbil-surface)] text-[var(--umbil-text)] border border-[var(--umbil-card-border)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={() => {
            trackFunnelEvent("upgrade_dismissed", { source: "upgrade_modal" });
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] bg-[var(--umbil-hover-bg)] rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          <div className="limit-modal-icon w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-[var(--umbil-brand-teal)]" />
          </div>
          
          <h3 className="text-2xl font-bold text-[var(--umbil-text)] mb-3">
            Unlock Umbil Pro
          </h3>
          <p className="text-[var(--umbil-muted)] mb-3">
            {featureName
              ? `You've used this month's free allowance for ${featureName}. Pro keeps the questions, letters, and learning from clinic in one place, so appraisal is not a separate job.`
              : "Pro keeps the questions, letters, and learning from clinic in one place, so appraisal is not a separate job."}
          </p>
          <StudentProNote onNavigate={onClose} />

          <div className="space-y-3 mb-8 text-left text-[var(--umbil-text)] bg-[var(--umbil-hover-bg)] p-5 rounded-2xl border border-[var(--umbil-divider)]">
            <p className="text-sm font-semibold text-[var(--umbil-muted)]">Free each month</p>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--umbil-muted)] flex-shrink-0" />
              <span className="font-medium">10 clinical questions, any answer style</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--umbil-muted)] flex-shrink-0" />
              <span className="font-medium">1 clinical tool generation</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--umbil-muted)] flex-shrink-0" />
              <span className="font-medium">1 new learning log. Saved entries stay available to read and export.</span>
            </div>
            <p className="text-sm font-semibold text-[var(--umbil-muted)] pt-2">Pro</p>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0" />
              <span className="font-medium">Questions, tools, and learning logs without a monthly cap</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0" />
              <span className="font-medium">Appraisal-ready patient and colleague feedback</span>
            </div>
            <p className="text-sm text-[var(--umbil-muted)]">7-day free trial, then £14.99/month. Cancel anytime.</p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                trackFunnelEvent("upgrade_clicked", { source: "upgrade_modal" });
                onClose();
                router.push('/pro');
              }}
              className="w-full py-3.5 px-4 bg-[var(--umbil-brand-teal)] text-[#083344] rounded-xl font-bold text-lg transition-all hover:brightness-95"
            >
              Start 7-day free trial
            </button>
            <button
              onClick={() => {
                trackFunnelEvent("upgrade_dismissed", { source: "upgrade_modal" });
                onClose();
              }}
              className="w-full py-3 px-4 text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] font-medium transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}