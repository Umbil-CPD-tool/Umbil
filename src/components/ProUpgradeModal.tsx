"use client";

import { X, Sparkles, Check } from "lucide-react";
import Link from "next/link";
import { trackFunnelEvent } from "@/lib/analytics/trackFunnelClient";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ProUpgradeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
};

type LimitKind = "questions" | "tools" | "learning";

const limitKind = (featureName?: string): LimitKind | null => {
  const name = featureName?.trim().toLowerCase() ?? "";
  if (!name) return null;
  if (/question|clinic|deep dive|standard|answer style/.test(name)) return "questions";
  if (/learn|cpd|reflect|grammar|tag|capture/.test(name)) return "learning";
  return "tools";
};

const limitSentence = (kind: LimitKind | null): string => {
  if (kind === "questions") return "You've used this month's 10 free questions.";
  if (kind === "tools") return "You've used this month's free tool.";
  if (kind === "learning") {
    return "You've used this month's free learning log. Saved entries stay available to read and export.";
  }
  return "Pro keeps the questions, letters, and learning from clinic in one place.";
};

const ProUpgradeModal = ({ isOpen, onClose, featureName }: ProUpgradeModalProps) => {
  const router = useRouter();
  const reached = limitKind(featureName);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    trackFunnelEvent("pricing_viewed", { source: "upgrade_modal" });
  }, [isOpen]);

  if (!isOpen) return null;

  const dismiss = () => {
    trackFunnelEvent("upgrade_dismissed", { source: "upgrade_modal" });
    onClose();
  };

  const rowClass = (kind: LimitKind) =>
    reached === kind ? "font-semibold text-[var(--umbil-text)]" : "font-medium text-[var(--umbil-muted)]";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--umbil-surface)] text-[var(--umbil-text)] border border-[var(--umbil-card-border)] rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 p-2 text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] bg-[var(--umbil-hover-bg)] rounded-full transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 py-7 sm:p-8 text-center">
          <div className="limit-modal-icon w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-7 h-7 text-[var(--umbil-brand-teal)]" />
          </div>

          <h3 className="text-2xl font-bold text-[var(--umbil-text)] mb-2">Unlock Umbil Pro</h3>
          <p className="text-[var(--umbil-muted)] mb-5 leading-relaxed">{limitSentence(reached)}</p>

          <div className="space-y-3 mb-5 text-left bg-[var(--umbil-hover-bg)] p-4 rounded-2xl border border-[var(--umbil-divider)]">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--umbil-muted)]">Free each month</p>
            <p className={rowClass("questions")}>10 clinical questions, any answer style</p>
            <p className={rowClass("tools")}>1 clinical tool</p>
            <p className={rowClass("learning")}>1 new learning log</p>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--umbil-brand-teal)] pt-2">Pro</p>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-[var(--umbil-brand-teal)] flex-shrink-0" />
              <span className="font-medium text-sm">Questions, tools, and learning logs without a monthly cap</span>
            </div>
            <div className="flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 text-[var(--umbil-brand-teal)] flex-shrink-0" />
              <span className="font-medium text-sm">Appraisal-ready patient and colleague feedback</span>
            </div>
          </div>

          <button
            onClick={() => {
              trackFunnelEvent("upgrade_clicked", { source: "upgrade_modal" });
              onClose();
              router.push("/pro");
            }}
            className="w-full py-3.5 px-4 bg-[var(--umbil-brand-teal)] text-[#083344] rounded-xl font-bold text-lg transition-all hover:brightness-95"
          >
            Start 7-day free trial
          </button>
          <p className="text-sm text-[var(--umbil-muted)] mt-2 mb-3">Then £14.99/month. Cancel anytime.</p>
          <button
            onClick={dismiss}
            className="w-full py-2 px-4 text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] font-medium transition-colors"
          >
            Maybe later
          </button>
          <p className="text-sm text-[var(--umbil-muted)] mt-1">
            Students with a .ac.uk email:{" "}
            <Link href="/pro" onClick={onClose} className="font-bold underline text-[var(--umbil-brand-teal)]">
              £4.99/month
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProUpgradeModal;
