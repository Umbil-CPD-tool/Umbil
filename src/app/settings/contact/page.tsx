// src/app/settings/contact/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Instagram, Facebook, Linkedin, MessageSquare, ExternalLink, Globe, Copy } from "lucide-react";
import Toast from "@/components/Toast";

// Placeholder for your actual external feedback form URL
const EXTERNAL_FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/1hDMhLdFbvVte_WHDgz3GaDXm9qQq6ElLuGfGavy98nw/viewform";

export default function ContactPage() {
  const [hasClicked, setHasClicked] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleClick = () => {
    // In a real application, you might log the click event to Supabase here.
    setHasClicked(true);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("masteringmedicineltd@gmail.com");
    setToastMessage("Email copied to clipboard!");
  };

  return (
    <section className="main-content relative w-full">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      
      <div className="container max-w-4xl mx-auto py-12 px-4 w-full">
        
        {/* Header */}
        <div className="text-center mb-12 animate-in fade-in duration-300">
          <h1 className="text-3xl md:text-4xl font-bold text-[var(--umbil-text)] mb-4">
            Get in Touch
          </h1>
          <p className="text-[var(--umbil-muted)] text-lg max-w-2xl mx-auto">
            Whether you're experiencing an issue, have a question, or just want to chat with the team, we're here to help.
          </p>
        </div>

        {/* Top Section: Contact & Socials */}
        {/* FIX: Added min-w-0 to prevent grid blowout on mobile */}
        <div className="grid md:grid-cols-2 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0">
          
          {/* Email Card */}
          {/* FIX: Changed p-8 to p-6 md:p-8 for more mobile room, added min-w-0 */}
          <div className="w-full min-w-0 bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 md:p-8 shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md">
            <div className="w-16 h-16 bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mb-5 shrink-0">
              <Mail size={28} />
            </div>
            <h2 className="text-xl font-bold text-[var(--umbil-text)] mb-3">Email Support</h2>
            <p className="text-[var(--umbil-muted)] text-sm mb-8 leading-relaxed">
              Reach out to our core team directly for account issues, billing queries, or general support. We aim to reply within 24 hours.
            </p>
            
            <div className="mt-auto w-full flex gap-2 min-w-0">
              <a
                href="mailto:masteringmedicineltd@gmail.com"
                className="flex-1 min-w-0 py-3.5 px-3 bg-[var(--umbil-hover-bg)] hover:bg-[var(--umbil-divider)] text-[var(--umbil-text)] font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Mail size={18} className="shrink-0" />
                {/* FIX: Added min-w-0 to parent and scaled text down slightly on mobile so it fits or truncates safely */}
                <span className="truncate text-[13px] sm:text-sm md:text-base">masteringmedicineltd@gmail.com</span>
              </a>
              <button
                onClick={handleCopyEmail}
                className="shrink-0 w-12 flex items-center justify-center bg-[var(--umbil-hover-bg)] hover:bg-[var(--umbil-divider)] text-[var(--umbil-text)] rounded-xl transition-colors cursor-pointer"
                title="Copy Email"
              >
                <Copy size={18} />
              </button>
            </div>

            <p className="text-[13px] text-[var(--umbil-muted)] mt-4 font-medium shrink-0">
              Looking for quick answers? <Link href="/about" className="text-[var(--umbil-brand-teal)] hover:underline">Visit our FAQ</Link>
            </p>
          </div>

          {/* Socials Card */}
          {/* FIX: Changed p-8 to p-6 md:p-8 for consistency */}
          <div className="w-full min-w-0 bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 md:p-8 shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md">
            <div className="w-16 h-16 bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mb-5 shrink-0">
              <Globe size={28} />
            </div>
            <h2 className="text-xl font-bold text-[var(--umbil-text)] mb-3">Our Socials</h2>
            <p className="text-[var(--umbil-muted)] text-sm mb-8 leading-relaxed">
              Follow our journey, stay updated on new clinical tools, and join the growing Umbil community online.
            </p>
            <div className="mt-auto w-full grid grid-cols-2 gap-3 min-w-0">
              <a
                href="https://www.instagram.com/umbil.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-1 min-w-0 bg-[var(--umbil-hover-bg)] hover:bg-[var(--umbil-divider)] text-[var(--umbil-text)] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 sm:gap-2 truncate"
              >
                <Instagram size={18} className="shrink-0" />
                <span className="truncate text-sm sm:text-base">Insta</span>
              </a>
              <a
                href="https://www.facebook.com/people/Umbil-AI/61565964025530/"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-1 min-w-0 bg-[var(--umbil-hover-bg)] hover:bg-[var(--umbil-divider)] text-[var(--umbil-text)] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 sm:gap-2 truncate"
              >
                <Facebook size={18} className="shrink-0" />
                <span className="truncate text-sm sm:text-base">Facebook</span>
              </a>
              <a
                href="https://uk.linkedin.com/company/umbil"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-1 min-w-0 bg-[var(--umbil-hover-bg)] hover:bg-[var(--umbil-divider)] text-[var(--umbil-text)] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 sm:gap-2 truncate"
              >
                <Linkedin size={18} className="shrink-0" />
                <span className="truncate text-sm sm:text-base">LinkedIn</span>
              </a>
              <a
                href="https://www.tiktok.com/@umbil_ai"
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-1 min-w-0 bg-[var(--umbil-hover-bg)] hover:bg-[var(--umbil-divider)] text-[var(--umbil-text)] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 sm:gap-2 truncate"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
                </svg>
                <span className="truncate text-sm sm:text-base">TikTok</span>
              </a>
            </div>
          </div>
        </div>

        {/* System Status Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 animate-in fade-in duration-700 w-full shrink-0">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-center">
            All systems operational
          </span>
        </div>

        {/* Bottom Section: Feedback Form */}
        <div className="w-full bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-8 md:p-12 shadow-sm text-center animate-in fade-in slide-in-from-bottom-8 duration-700 min-w-0">
          {!hasClicked ? (
            <div className="max-w-xl mx-auto w-full">
              <h2 className="text-2xl font-bold text-[var(--umbil-text)] mb-4">Feature Ideas & Bug Reports</h2>
              <p className="text-[var(--umbil-muted)] mb-8 leading-relaxed">
                Have a suggestion to improve Umbil or found a bug? We thrive on feedback from clinicians like you. Use our dedicated form to log it securely with our product team.
              </p>
              <a
                className="btn btn--primary w-full md:w-auto px-10 py-4 text-base rounded-xl flex items-center justify-center gap-2 mx-auto shadow-lg shadow-[var(--umbil-brand-teal)]/20"
                href={EXTERNAL_FEEDBACK_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleClick}
              >
                <ExternalLink size={20} className="shrink-0" />
                Open Feedback Form
              </a>
              <p className="text-sm text-[var(--umbil-muted)] mt-5 font-medium">
                We read every submission to shape our next updates.
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto py-6 animate-in zoom-in-95 duration-300 w-full">
              <div className="w-20 h-20 bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-6 shrink-0">
                <MessageSquare size={36} />
              </div>
              <h3 className="text-2xl font-bold text-[var(--umbil-brand-teal)] mb-3">Thank You!</h3>
              <p className="text-[var(--umbil-muted)] mb-8">
                The feedback form has opened securely in a new tab. We deeply appreciate your input in making Umbil better.
              </p>
              <button
                className="btn btn--outline rounded-xl px-8 py-3 font-bold"
                onClick={() => setHasClicked(false)}
              >
                Submit another response
              </button>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
