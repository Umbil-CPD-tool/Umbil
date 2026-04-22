// src/components/ClientLayout.tsx
"use client";

import { useState } from "react";
import { ThemeProvider } from "@/hooks/useTheme";
import AuthButtons from "@/components/AuthButtons";
import MobileNav from "@/components/MobileNav";
import { useUserEmail } from "@/hooks/useUser";
import { useCpdStreaks } from "@/hooks/useCpdStreaks";
import { Analytics } from "@vercel/analytics/react";
import { Sparkles } from "lucide-react";
import Link from "next/link";

function GlobalStreakDisplay() {
  const { email } = useUserEmail();
  const { currentStreak, hasLoggedToday, loading } = useCpdStreaks();

  if (loading || !email) return null;

  const streakDisplay = currentStreak > 0 ? currentStreak : 0;
  const className = `global-streak ${hasLoggedToday ? '' : 'faded'}`;
  const title = hasLoggedToday 
    ? "You've captured learning today! Click to view your profile." 
    : "Capture learning today to keep your streak alive! Click to view your profile.";

  return (
    <a href="/profile" className={className} title={title}>
      {streakDisplay} 🔥
    </a>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { email, isPro, loading } = useUserEmail();

  return (
    <ThemeProvider>
      <div 
        id="root" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100dvh', 
          overflow: 'hidden',
          backgroundColor: 'var(--umbil-bg)',
          color: 'var(--umbil-text)'
        }}
      >
        <header className="header" style={{ flexShrink: 0, backgroundColor: 'var(--umbil-surface)' }}>
          <div className="header-left">
            <button
              id="tour-highlight-sidebar-button"
              className="menu-button"
              aria-label="Open sidebar menu"
              onClick={() => setIsMobileNavOpen(true)}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="logo-section">
            <a href={email ? "/dashboard" : "/"} className="logo-link">
              <h2 className="umbil-logo-text">Umbil</h2>
              <p className="tagline">Your Medical Lifeline</p>
            </a>
          </div>

          <div className="header-right flex items-center gap-3">
            {email && !loading && (
              <Link 
                href="/pro" 
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition-all ${
                  isPro 
                    ? 'bg-[var(--umbil-surface)] border-[var(--umbil-card-border)] text-[var(--umbil-brand-teal)] hover:bg-gray-50/50 dark:hover:bg-slate-800' 
                    : 'bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border-teal-200/50 dark:border-teal-800/50 text-[var(--umbil-brand-teal)] hover:shadow-md'
                }`}
              >
                {!isPro && <Sparkles size={14} className="text-yellow-500" />}
                {isPro ? "Umbil Pro" : "Upgrade"}
              </Link>
            )}
            
            <GlobalStreakDisplay />
            <AuthButtons />
          </div>
        </header>

        <main 
          style={{ 
            flex: 1, 
            display: 'flex', 
            flexDirection: 'column', 
            overflowY: 'auto', 
            position: 'relative',
            backgroundColor: 'var(--umbil-bg)' 
          }}
        >
          {children}
        </main>

        <MobileNav
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          userEmail={email}
        />
      </div>
      <Analytics />
    </ThemeProvider>
  );
}