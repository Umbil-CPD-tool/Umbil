"use client";

import { X, UserRound, FileSignature, Stethoscope, BadgeCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const PROFILE_PROMPT_NEVER_KEY = "umbil_profile_prompt_never";
export const PROFILE_PROMPT_SNOOZE_KEY = "umbil_profile_prompt_snooze_until";
/** Soft re-prompt cadence: long enough to avoid nagging, short enough that sign-off still feels useful. */
export const PROFILE_PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

type ProfileCompletionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  missingName: boolean;
  missingGrade: boolean;
};

export default function ProfileCompletionModal({
  isOpen,
  onClose,
  missingName,
  missingGrade,
}: ProfileCompletionModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const missingBoth = missingName && missingGrade;
  const title = missingBoth
    ? "Add your name & grade"
    : missingName
      ? "Add your name"
      : "Add your position / grade";

  const handleComplete = () => {
    onClose();
    router.push("/profile");
  };

  /** Same as "Remind me in a week" — used by X so closing doesn't re-prompt on every visit. */
  const handleRemindLater = () => {
    try {
      localStorage.setItem(
        PROFILE_PROMPT_SNOOZE_KEY,
        String(Date.now() + PROFILE_PROMPT_SNOOZE_MS)
      );
    } catch {
      // Ignore storage failures — still close so we don't block the user.
    }
    onClose();
  };

  const handleNever = () => {
    try {
      localStorage.setItem(PROFILE_PROMPT_NEVER_KEY, "true");
      localStorage.removeItem(PROFILE_PROMPT_SNOOZE_KEY);
    } catch {
      // Ignore storage failures.
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.55)" }}
    >
      <div
        className="rounded-3xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-completion-title"
        style={{
          backgroundColor: "var(--umbil-surface)",
          color: "var(--umbil-text)",
          border: "1px solid var(--umbil-card-border)",
          boxShadow: "var(--umbil-shadow-lg)",
        }}
      >
        <button
          type="button"
          onClick={handleRemindLater}
          aria-label="Remind me in a week"
          className="absolute top-4 right-4 p-2 rounded-full transition-colors z-10"
          style={{
            color: "var(--umbil-muted)",
            backgroundColor: "var(--umbil-hover-bg)",
          }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "rgba(31, 184, 205, 0.15)" }}
          >
            <UserRound className="w-8 h-8" style={{ color: "var(--umbil-brand-teal)" }} />
          </div>

          <h3
            id="profile-completion-title"
            className="text-2xl font-bold mb-3"
            style={{ color: "var(--umbil-text)" }}
          >
            {title}
          </h3>
          <p className="mb-8" style={{ color: "var(--umbil-muted)" }}>
            Takes under a minute — and helps Umbil deliver work that already looks like it came from you.
          </p>

          <div
            className="space-y-4 mb-8 text-left p-5 rounded-2xl"
            style={{
              color: "var(--umbil-text)",
              backgroundColor: "var(--umbil-bg)",
              border: "1px solid var(--umbil-card-border)",
            }}
          >
            <div className="flex items-start gap-3">
              <FileSignature
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{ color: "var(--umbil-brand-teal)" }}
              />
              <span className="font-medium">
                Auto-sign referral letters and discharge summaries with your name and grade
              </span>
            </div>
            <div className="flex items-start gap-3">
              <Stethoscope
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{ color: "var(--umbil-brand-teal)" }}
              />
              <span className="font-medium">
                Get answers pitched closer to your level of practice
              </span>
            </div>
            <div className="flex items-start gap-3">
              <BadgeCheck
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{ color: "var(--umbil-brand-teal)" }}
              />
              <span className="font-medium">
                Show up correctly across Umbil — no placeholder sign-offs
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleComplete}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-lg transition-all"
              style={{
                backgroundColor: "var(--umbil-brand-teal)",
                color: "#ffffff",
                boxShadow: "0 8px 20px rgba(31, 184, 205, 0.25)",
              }}
            >
              Update profile
            </button>
            <button
              type="button"
              onClick={handleRemindLater}
              className="w-full py-3 px-4 font-medium transition-colors"
              style={{ color: "var(--umbil-muted)" }}
            >
              Remind me in a week
            </button>
            <button
              type="button"
              onClick={handleNever}
              className="w-full py-1 text-sm transition-colors"
              style={{ color: "var(--umbil-muted)", opacity: 0.85 }}
            >
              Don&apos;t remind me again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const isProfileIncomplete = (
  profile: { full_name: string | null; grade: string | null } | null
): boolean => {
  if (!profile) return false;
  return !profile.full_name?.trim() || !profile.grade?.trim();
};

export const shouldShowProfilePrompt = (): boolean => {
  try {
    if (localStorage.getItem(PROFILE_PROMPT_NEVER_KEY) === "true") return false;
    const snoozeUntil = localStorage.getItem(PROFILE_PROMPT_SNOOZE_KEY);
    if (snoozeUntil && Date.now() < Number(snoozeUntil)) return false;
    return true;
  } catch {
    return true;
  }
};
