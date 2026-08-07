// src/components/GuestLimitModal.tsx
"use client";

import { Lock, UserPlus, X } from "lucide-react";
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
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-300">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-[#33e1ff]/20 dark:bg-[#33e1ff]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-[#33e1ff] dark:text-[#33e1ff]" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Guest Limit Reached
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            You have reached the free exploration limit. Please sign in or create an account to continue using Umbil, access specialized tools, and save your clinical learning.
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => router.push('/auth')}
              className="w-full py-4 px-4 bg-[#33e1ff] hover:bg-[#33e1ff]/90 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-[#33e1ff]/30 dark:shadow-none flex items-center justify-center gap-2"
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