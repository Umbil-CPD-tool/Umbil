// src/components/GuestLimitModal.tsx
"use client";

import { Lock, UserPlus, X } from "lucide-react";
import { StudentProNote } from "@/components/StudentProNote";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type GuestLimitModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function GuestLimitModal({ isOpen, onClose }: GuestLimitModalProps) {
  const router = useRouter();

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity">
      <div className="bg-[var(--umbil-surface)] text-[var(--umbil-text)] border border-[var(--umbil-card-border)] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-300">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] bg-[var(--umbil-hover-bg)] rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          <div className="limit-modal-icon w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-[var(--umbil-brand-teal)]" />
          </div>
          
          <h3 className="text-2xl font-bold text-[var(--umbil-text)] mb-3">
            Guest Limit Reached
          </h3>
          
          <p className="text-[var(--umbil-muted)] mb-3 leading-relaxed">
            You have reached the free exploration limit. Please sign in or create an account to continue using Umbil, access specialized tools, and save your clinical learning.
          </p>
          <StudentProNote signedIn={false} onNavigate={onClose} />

          <div className="flex flex-col gap-4">
            <button
              onClick={() => router.push('/auth?mode=signup')}
              className="w-full py-4 px-4 bg-[var(--umbil-brand-teal)] text-[#083344] rounded-xl font-bold text-lg transition-all hover:brightness-95 flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Sign In / Sign Up
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}