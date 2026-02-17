// src/components/landing/WorkflowLandingPage.tsx
"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, HelpCircle } from "lucide-react";
import { TrustFooter } from "@/components/landing/LandingSections";
import { motion } from "framer-motion";
import { useUserEmail } from "@/hooks/useUser";

interface WorkflowPageProps {
  title: string;
  subtitle: string;
  description: string;
  bulletPoints: string[];
  faqs: { question: string; answer: string }[];
  toolId?: string; // Optional: specific query param for the dashboard (e.g., 'referral')
}

export default function WorkflowLandingPage({
  title,
  subtitle,
  description,
  bulletPoints,
  faqs,
  toolId = "new" // Default to just a new chat if no specific tool ID is passed
}: WorkflowPageProps) {
  
  // 1. Check if the user is already logged in
  const { email, loading } = useUserEmail();

  // 2. Determine where the button should take them
  const destination = email ? `/dashboard?tool=${toolId}` : "/auth";
  const buttonText = email ? "Open Tool Now" : "Try this tool for free";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans selection:bg-[var(--umbil-brand-teal)]/30">
      
      {/* HERO SECTION */}
      <section className="pt-32 pb-20 px-6 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] text-xs font-bold uppercase tracking-wider border border-[var(--umbil-brand-teal)]/20">
            Clinical Workflow Tool
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-slate-900 dark:text-white leading-tight">
            {title}
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
          
          {/* SMART CTA BUTTON */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!loading && (
              <Link 
                href={destination} 
                className="px-8 py-4 bg-[var(--umbil-brand-teal)] hover:opacity-90 !text-white font-bold rounded-xl shadow-lg shadow-[var(--umbil-brand-teal)]/20 transition-all transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                {buttonText} <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </motion.div>
      </section>

      {/* DESCRIPTION & BENEFITS */}
      <section className="py-16 px-6 bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">How it helps</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              {description}
            </p>
            <ul className="space-y-4">
              {bulletPoints.map((point, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="text-[var(--umbil-brand-teal)] shrink-0 mt-1" size={20} />
                  <span className="text-slate-700 dark:text-slate-300">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dynamic Placeholder Visual */}
          <div className="bg-slate-100 dark:bg-slate-800 rounded-3xl aspect-video flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden relative group">
             {/* You can replace this later with an actual Image component passing a 'screenshot' prop */}
             <div className="absolute inset-0 bg-gradient-to-br from-[var(--umbil-brand-teal)]/10 to-indigo-500/10 opacity-50"></div>
             <div className="text-slate-400 font-medium flex flex-col items-center gap-3 z-10">
               <span className="p-4 bg-white dark:bg-slate-900 rounded-full shadow-lg">
                 <CheckCircle2 size={32} className="text-[var(--umbil-brand-teal)]" />
               </span>
               <span>{title} Preview</span>
             </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      {/* Removed mb-20 margin here to eliminate the empty white section */}
      <section className="pt-20 pb-0 px-6 max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-6 mb-0">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                <HelpCircle size={18} className="text-[var(--umbil-brand-teal)]" /> {faq.question}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      <TrustFooter />
    </div>
  );
}