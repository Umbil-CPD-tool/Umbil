// src/components/CookieBanner.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already made a choice
    const consent = localStorage.getItem("umbil_cookie_consent");
    if (!consent) {
      // Small delay to make the animation feel smoother on load
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleChoice = (choice: 'all' | 'essential') => {
    localStorage.setItem("umbil_cookie_consent", choice);
    setIsVisible(false);
    
    // Note: If you add Google Analytics or PostHog later, 
    // you would initialize them here if choice === 'all'
  };

  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-[400px] z-[9999] animate-in slide-in-from-bottom-10 fade-in duration-500"
      role="dialog"
      aria-labelledby="cookie-heading"
    >
      <div 
        style={{ 
          backgroundColor: 'var(--umbil-surface, #ffffff)', 
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          border: '1px solid var(--umbil-card-border, rgba(0,0,0,0.1))',
          padding: '24px',
          color: 'var(--umbil-text, #1f2937)'
        }}
      >
        <h3 id="cookie-heading" className="text-lg font-semibold mb-2" style={{ color: 'var(--umbil-foreground)' }}>
          We use cookies 🍪
        </h3>
        <p className="text-sm mb-6" style={{ color: 'var(--umbil-muted, #6b7280)', lineHeight: '1.5' }}>
          Umbil uses essential cookies to keep you logged in and save your work securely. 
          We don&apos;t use marketing trackers.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleChoice('all')}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              backgroundColor: 'var(--umbil-brand-teal, #1fb8cd)',
              borderRadius: '8px', // Boxy style
            }}
          >
            Accept All
          </button>
          
          <button
            onClick={() => handleChoice('essential')}
            className="w-full py-2.5 px-4 text-sm font-semibold transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid var(--umbil-divider, #e5e7eb)',
              color: 'var(--umbil-muted, #6b7280)',
              borderRadius: '8px', // Boxy style
            }}
          >
            Essential Only
          </button>
        </div>

        <div className="mt-4 text-center">
            <Link href="/about" className="text-xs underline opacity-60 hover:opacity-100 transition-opacity">
                Read our Privacy Policy
            </Link>
        </div>
      </div>
    </div>
  );
}