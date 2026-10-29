"use client";

import { X, UserRound, FileSignature, Stethoscope, BadgeCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { profileCompletionTitle } from "@/lib/clinicalProfile";

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

const ProfileCompletionModal = ({
  isOpen,
  onClose,
  missingName,
  missingGrade,
}: ProfileCompletionModalProps) => {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // iPhone Safari's layout viewport is taller than the visible screen, so a
  // centred fixed sheet hides the close control above the page and the
  // actions under the toolbar. Pin the overlay to the visual viewport.
  useEffect(() => {
    if (!isOpen) return;
    const overlay = overlayRef.current;
    const viewport = window.visualViewport;
    if (!overlay || !viewport) return;

    const fitToVisibleScreen = () => {
      overlay.style.height = `${viewport.height}px`;
      overlay.style.width = `${viewport.width}px`;
      overlay.style.top = `${viewport.offsetTop}px`;
      overlay.style.left = `${viewport.offsetLeft}px`;
    };

    fitToVisibleScreen();
    viewport.addEventListener("resize", fitToVisibleScreen);
    viewport.addEventListener("scroll", fitToVisibleScreen);
    return () => {
      viewport.removeEventListener("resize", fitToVisibleScreen);
      viewport.removeEventListener("scroll", fitToVisibleScreen);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const title = profileCompletionTitle({
    missingName,
    missingGrade,
  });

  const handleComplete = () => {
    onClose();
    router.push("/profile#clinical-details");
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
      ref={overlayRef}
      className="fixed left-0 top-0 z-[100] box-border flex h-screen w-full flex-col backdrop-blur-sm supports-[height:100svh]:h-svh"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
      }}
    >
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div
          className="relative flex max-h-full min-h-0 w-full max-w-md flex-col overflow-hidden rounded-3xl animate-in fade-in zoom-in duration-200"
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
          <div className="flex shrink-0 justify-end px-3 pt-3">
            <button
              type="button"
              onClick={handleRemindLater}
              aria-label="Remind me in a week"
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors"
              style={{
                color: "var(--umbil-muted)",
                backgroundColor: "var(--umbil-hover-bg)",
              }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-8 sm:pb-8">
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full sm:mb-6 sm:h-16 sm:w-16"
              style={{ backgroundColor: "rgba(31, 184, 205, 0.15)" }}
            >
              <UserRound className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: "var(--umbil-brand-teal)" }} />
            </div>

            <h3
              id="profile-completion-title"
              className="mb-2 text-center text-xl font-bold sm:mb-3 sm:text-2xl"
              style={{ color: "var(--umbil-text)" }}
            >
              {title}
            </h3>
            <p className="mb-4 text-center text-sm leading-snug sm:mb-8 sm:text-base" style={{ color: "var(--umbil-muted)" }}>
              Takes under a minute. Add a freestyle role line — e.g. GP or ST4 Cardiology — so Umbil can pitch answers to your level.
            </p>

            <div
              className="mb-4 space-y-3 rounded-2xl p-4 text-left text-sm sm:mb-8 sm:space-y-4 sm:p-5 sm:text-base"
              style={{
                color: "var(--umbil-text)",
                backgroundColor: "var(--umbil-bg)",
                border: "1px solid var(--umbil-card-border)",
              }}
            >
              <div className="flex items-start gap-3">
                <Stethoscope
                  className="mt-0.5 h-5 w-5 flex-shrink-0"
                  style={{ color: "var(--umbil-brand-teal)" }}
                />
                <span className="font-medium">
                  Get answers curated to your level of practice, not a generic textbook
                </span>
              </div>
              <div className="flex items-start gap-3">
                <FileSignature
                  className="mt-0.5 h-5 w-5 flex-shrink-0"
                  style={{ color: "var(--umbil-brand-teal)" }}
                />
                <span className="font-medium">
                  Auto-sign referral letters and discharge summaries with your name and grade
                </span>
              </div>
              <div className="flex items-start gap-3">
                <BadgeCheck
                  className="mt-0.5 h-5 w-5 flex-shrink-0"
                  style={{ color: "var(--umbil-brand-teal)" }}
                />
                <span className="font-medium">
                  Help later NHS / public reporting stay accurate — aggregated and de-identified, never a named dump
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleComplete}
                className="w-full rounded-xl px-4 py-3 text-base font-bold transition-all sm:py-3.5 sm:text-lg"
                style={{
                  backgroundColor: "var(--umbil-brand-teal)",
                  color: "#ffffff",
                  boxShadow: "0 8px 20px rgba(31, 184, 205, 0.25)",
                }}
              >
                Go to profile
              </button>
              <button
                type="button"
                onClick={handleRemindLater}
                className="w-full px-4 py-2.5 font-medium transition-colors sm:py-3"
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
    </div>
  );
};

export default ProfileCompletionModal;

export {
  getMissingProfileFields,
  isProfileIncomplete,
  profileCompletionTitle,
} from "@/lib/clinicalProfile";

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
