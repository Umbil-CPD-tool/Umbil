"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserEmail } from "@/hooks/useUser";
import { motion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck, Wifi, Star, Sparkles, User, BookOpen } from "lucide-react";
import { 
  HowItWorks,
  CoreTools, 
  CaptureLearning, 
  TrustFooter 
} from "./landing/LandingSections";

export default function LandingPage() {
  const { email, loading } = useUserEmail();
  const router = useRouter();

  // Redirect logged-in users
  useEffect(() => {
    if (!loading && email) {
      router.replace("/dashboard");
    }
  }, [loading, email, router]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 overflow-x-hidden font-sans selection:bg-teal-500/30 selection:text-teal-900 dark:selection:text-teal-50">
      
      {/* --- MODERN AMBIENT BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Top Right Teal Glow */}
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[120px] mix-blend-multiply dark:mix-blend-screen animate-pulse duration-1000"></div>
        {/* Bottom Left Indigo Glow */}
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] mix-blend-multiply dark:mix-blend-screen"></div>
        {/* Subtle Texture */}
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03] dark:opacity-[0.05]"></div>
      </div>

      <div className="relative z-10">
        
        {/* --- 1. HERO SECTION --- */}
        <section className="pt-32 pb-20 md:pt-40 md:pb-32 px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* LEFT: Copy & CTA */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-6 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-8">
                <Star size={12} className="fill-current" />
                Trusted by 424 UK Clinicians
              </div>

              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
                Clinical answers <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--umbil-brand-teal)] to-teal-400">
                  in seconds.
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-light">
                Ask complex questions in plain English. Get structured summaries sourced strictly from <strong>NICE, CKS, SIGN, and BNF</strong>.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12">
                <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-[var(--umbil-brand-teal)] hover:bg-teal-600 !text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                  Ask your first question
                  <ArrowRight size={18} />
                </Link>
                <Link href="/dashboard?tour=true" className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-white/10 transition-colors backdrop-blur-sm">
                  See how it works
                </Link>
              </div>

              {/* Trust Bullets */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-3 text-sm font-medium text-slate-500 dark:text-slate-500">
                <div className="flex items-center gap-2">
                   <ShieldCheck size={16} className="text-teal-600 dark:text-teal-400" />
                   <span>GDPR Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                   <Check size={16} className="text-teal-600 dark:text-teal-400" />
                   <span>CKS & BNF Sources</span>
                </div>
                <div className="flex items-center gap-2">
                   <Wifi size={16} className="text-teal-600 dark:text-teal-400" />
                   <span>Works on NHS WiFi</span>
                </div>
              </div>
            </motion.div>

            {/* RIGHT: High-Fidelity Dashboard Mockup */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="lg:col-span-6 relative flex justify-center lg:justify-end"
            >
              {/* Abstract Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-teal-500/20 blur-[80px] rounded-full -z-10"></div>
              
              {/* Interface Card */}
              <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-slate-200 dark:border-slate-800 overflow-hidden ring-1 ring-slate-900/5">
                
                {/* Header Mockup */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                     <span className="font-bold text-slate-700 dark:text-slate-200 text-sm tracking-tight">Umbil Clinical</span>
                     <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300">BETA</span>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="p-6 space-y-6 bg-white dark:bg-[#0B1120]">
                  
                  {/* User Query */}
                  <div className="flex justify-end">
                    <div className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-2xl rounded-tr-none text-sm font-medium shadow-sm max-w-[85%]">
                      Red flags for back pain?
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--umbil-brand-teal)] to-teal-600 flex items-center justify-center flex-shrink-0 text-white shadow-lg shadow-teal-500/20 mt-1">
                      <Sparkles size={14} />
                    </div>
                    
                    <div className="flex-1 space-y-3">
                       <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-none shadow-sm overflow-hidden">
                          
                          {/* Analysis Section */}
                          <div className="p-4 border-b border-slate-50 dark:border-slate-800/50">
                             <h4 className="text-[10px] font-bold text-[var(--umbil-brand-teal)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                               <Sparkles size={10} /> Analysis
                             </h4>
                             <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                               Based on <strong>NICE CKS (Back pain - low)</strong>, immediate red flags requiring urgent investigation include:
                             </p>
                          </div>

                          {/* Structured Content */}
                          <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50">
                             <ul className="space-y-2">
                                <li className="flex gap-2 text-xs text-slate-700 dark:text-slate-300">
                                   <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></span>
                                   <span><strong>Cauda Equina:</strong> Urinary retention, fecal incontinence, saddle anesthesia.</span>
                                </li>
                                <li className="flex gap-2 text-xs text-slate-700 dark:text-slate-300">
                                   <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></span>
                                   <span><strong>Spinal Fracture:</strong> Significant trauma, age &gt;50, corticosteroid use.</span>
                                </li>
                                <li className="flex gap-2 text-xs text-slate-700 dark:text-slate-300">
                                   <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></span>
                                   <span><strong>Cancer:</strong> History of cancer, unexplained weight loss.</span>
                                </li>
                             </ul>
                          </div>
                          
                          {/* Footer / Sources */}
                          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                             <div className="flex items-center gap-1.5">
                                <BookOpen size={10} />
                                <span>Source: NICE CKS (Revised 2024)</span>
                             </div>
                             <span className="text-[var(--umbil-brand-teal)] font-medium">Verify Source &rarr;</span>
                          </div>

                       </div>
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>

          </div>
        </section>

        {/* --- 2. HOW IT WORKS --- */}
        <HowItWorks />

        {/* --- 3. SECONDARY TOOLS --- */}
        <CoreTools />

        {/* --- 4. LEARNING --- */}
        <CaptureLearning />

        {/* --- 5. FOOTER --- */}
        <TrustFooter />

      </div>
    </div>
  );
}