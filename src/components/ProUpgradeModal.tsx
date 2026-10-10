// src/components/ProUpgradeModal.tsx
"use client";

import { STUDENT_PRO_OFFER } from "@umbil/shared";
import { X, Sparkles, CheckCircle2 } from "lucide-react";
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-[var(--umbil-surface)] text-[var(--umbil-text)] border border-[var(--umbil-card-border)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
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
              ? `You've reached your free limit for ${featureName}. Try Pro free for 1 month — cancel anytime.` 
              : "Try Umbil Pro free for 1 month. Unlimited CPD logging, Deep Dive clinical reasoning, and all tools. Cancel anytime."}
          </p>
          <p className="text-sm text-[var(--umbil-muted)] mb-8">{STUDENT_PRO_OFFER}</p>

          <div className="space-y-4 mb-8 text-left text-[var(--umbil-text)] bg-[var(--umbil-hover-bg)] p-5 rounded-2xl border border-[var(--umbil-divider)]">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0" />
              <span className="font-medium">Unlimited Capture Learning logs & reflection prompts</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0" />
              <span className="font-medium">Unlimited clinical tool usage (Referrals, SBAR writer, Translation)</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0" />
              <span className="font-medium">Appraisal-Ready Patient (PSQ) and Colleague (MSF) Feedback Reports</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0" />
              <span className="font-medium">Automated Personal Development Plan (PDP) Generation</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                onClose();
                router.push('/pro');
              }}
              className="w-full py-3.5 px-4 bg-[var(--umbil-brand-teal)] text-[#083344] rounded-xl font-bold text-lg transition-all hover:brightness-95"
            >
              Unlock your free month
            </button>
            <button
              onClick={onClose}
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