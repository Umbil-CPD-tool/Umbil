"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserEmail } from "@/hooks/useUser";
import { motion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck, Wifi } from "lucide-react";
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
      
      {/* --- BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-slate-50 dark:bg-[#0B1120]">
        {/* Subtle top sheen */}
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent opacity-60"></div>
        {/* Very subtle grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_10%,transparent_100%)]"></div>
      </div>

      <div className="relative z-10">
        
        {/* --- 1. HERO SECTION --- */}
        <section className="pt-32 pb-12 px-6">
          <div className="container mx-auto max-w-4xl text-center">
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
                Instant Clinical Answers. <br/>
                <span className="text-[var(--umbil-brand-teal)]">Backed by UK Guidance.</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-3xl mx-auto font-light">
                Ask complex clinical questions. Get clear, structured summaries based on NICE, CKS, SIGN, and BNF.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                <Link href="/dashboard" className="w-full sm:w-auto px-10 py-4 bg-[var(--umbil-brand-teal)] hover:bg-teal-600 !text-white font-bold rounded-sm shadow-xl shadow-teal-500/10 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 text-lg">
                  Try Umbil Free
                  <ArrowRight size={20} />
                </Link>
                <Link href="/dashboard?tour=true" className="w-full sm:w-auto px-10 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-3 text-lg">
                  See how it works
                </Link>
              </div>

              {/* Trust Bullets */}
              <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-sm font-medium text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                   <ShieldCheck size={18} className="text-[var(--umbil-brand-teal)]" />
                   <span>No patient-identifiable data</span>
                </div>
                <div className="flex items-center gap-2">
                   <Check size={18} className="text-[var(--umbil-brand-teal)]" />
                   <span>UK NICE/CKS Sources</span>
                </div>
                <div className="flex items-center gap-2">
                   <Wifi size={18} className="text-[var(--umbil-brand-teal)]" />
                   <span>Works on Hospital WiFi</span>
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