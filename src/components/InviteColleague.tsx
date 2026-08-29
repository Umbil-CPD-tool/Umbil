"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Mail, MessageCircle, Share2, X } from "lucide-react";
import {
  INVITE_MESSAGE,
  INVITE_URL,
  copyInviteMessage,
  getInviteEmailHref,
  getInviteSmsHref,
  getInviteWhatsAppHref,
  shareInviteNative,
} from "@/lib/invite";

type InviteColleagueProps = {
  variant?: "header" | "hero" | "settings";
};

const InviteSheet = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const ok = await copyInviteMessage();
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const channelClass =
    "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold border transition-colors";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.55)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-colleague-title"
        className="rounded-3xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200"
        style={{
          backgroundColor: "var(--umbil-surface)",
          color: "var(--umbil-text)",
          border: "1px solid var(--umbil-card-border)",
          boxShadow: "var(--umbil-shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full transition-colors z-10"
          style={{
            color: "var(--umbil-muted)",
            backgroundColor: "var(--umbil-hover-bg)",
          }}
          aria-label="Close invite"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pt-10">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: "rgba(31, 184, 205, 0.15)" }}
          >
            <Share2 className="w-7 h-7" style={{ color: "var(--umbil-brand-teal)" }} />
          </div>

          <h3
            id="invite-colleague-title"
            className="text-2xl font-bold mb-2 text-center"
            style={{ color: "var(--umbil-text)" }}
          >
            Invite a colleague
          </h3>
          <p
            className="text-center text-sm mb-5"
            style={{ color: "var(--umbil-muted)", lineHeight: 1.5 }}
          >
            A short note is ready to send. Most people share this on WhatsApp or by text.
          </p>

          <div
            className="text-sm rounded-xl p-3 mb-5"
            style={{
              backgroundColor: "var(--umbil-hover-bg)",
              border: "1px solid var(--umbil-card-border)",
              color: "var(--umbil-text)",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {INVITE_MESSAGE}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full py-3 px-4 rounded-xl font-bold text-base transition-all mb-3 flex items-center justify-center gap-2"
            style={{
              backgroundColor: "var(--umbil-brand-teal)",
              color: "#ffffff",
            }}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
            {copied ? "Copied \u2014 paste anywhere" : "Copy message"}
          </button>

          <div className="grid grid-cols-3 gap-2">
            <a
              href={getInviteWhatsAppHref()}
              target="_blank"
              rel="noopener noreferrer"
              className={channelClass}
              style={{
                borderColor: "var(--umbil-card-border)",
                color: "var(--umbil-text)",
                backgroundColor: "var(--umbil-hover-bg)",
              }}
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
            <a
              href={getInviteEmailHref()}
              className={channelClass}
              style={{
                borderColor: "var(--umbil-card-border)",
                color: "var(--umbil-text)",
                backgroundColor: "var(--umbil-hover-bg)",
              }}
            >
              <Mail size={16} />
              Email
            </a>
            <a
              href={getInviteSmsHref()}
              className={channelClass}
              style={{
                borderColor: "var(--umbil-card-border)",
                color: "var(--umbil-text)",
                backgroundColor: "var(--umbil-hover-bg)",
              }}
            >
              Text
            </a>
          </div>

          <p
            className="text-center text-xs mt-4"
            style={{ color: "var(--umbil-muted)" }}
          >
            {INVITE_URL.replace("https://", "")}
          </p>
        </div>
      </div>
    </div>
  );
};

const InviteColleague = ({ variant = "header" }: InviteColleagueProps) => {
  const [sheetOpen, setSheetOpen] = useState(false);

  const openInvite = async () => {
    const usedNative = await shareInviteNative();
    if (!usedNative) setSheetOpen(true);
  };

  return (
    <>
      {variant === "header" && (
        <button
          type="button"
          onClick={openInvite}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-sm font-semibold border transition-all hover:bg-[var(--umbil-hover-bg)]"
          style={{
            backgroundColor: "var(--umbil-surface)",
            borderColor: "var(--umbil-card-border)",
            color: "var(--umbil-text)",
          }}
          aria-label="Invite a colleague"
          title="Invite a colleague"
        >
          <Share2 size={14} style={{ color: "var(--umbil-brand-teal)" }} />
          <span className="hidden sm:inline">Invite</span>
        </button>
      )}

      {variant === "hero" && (
        <button
          type="button"
          onClick={openInvite}
          className="text-sm font-medium mt-2"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--umbil-brand-teal)",
          }}
        >
          Know a colleague who&apos;d find this useful? Invite them
        </button>
      )}

      {variant === "settings" && (
        <button
          type="button"
          className="btn btn--outline"
          onClick={openInvite}
          style={{ width: "100%", justifyContent: "center" }}
        >
          Invite a colleague
        </button>
      )}

      <InviteSheet isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
};

export default InviteColleague;
