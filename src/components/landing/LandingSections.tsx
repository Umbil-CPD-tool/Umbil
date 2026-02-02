"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  FileText, 
  Shield, 
  Activity, 
  CheckCircle2, 
  Languages,
  Search,
  BookOpen,
  Stethoscope,
  Lock,
  ArrowRight
} from "lucide-react";

// --- SECTION 1: HOW IT WORKS ---
export function HowItWorks() {
  return (
    <section className="py-24 px-6 relative overflow-hidden">
      <div className="w-full max-w-6xl mx-auto">
        
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            From Question to Guidance
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            A frictionless workflow designed for the busy ward environment.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-[2px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent -z-10"></div>

          {/* Step 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center relative"
          >
            <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 flex items-center justify-center mb-8 border border-slate-100 dark:border-slate-800 rotate-3 hover:rotate-0 transition-transform duration-300">
              <Search className="text-[var(--umbil-brand-teal)]" size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Ask Naturally</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed px-6">
              Type short, messy notes or full questions. <br/>
              <span className="italic opacity-80">"Red flags for back pain?"</span>
            </p>
          </motion.div>

          {/* Step 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 flex items-center justify-center mb-8 border border-slate-100 dark:border-slate-800 -rotate-3 hover:rotate-0 transition-transform duration-300">
              <BookOpen className="text-indigo-500" size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. Instant Synthesis</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed px-6">
              We check <strong>NICE, CKS, & BNF</strong> in real-time to generate a safe answer.
            </p>
          </motion.div>

          {/* Step 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center text-center"
          >
            <div className="w-32 h-32 bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 flex items-center justify-center mb-8 border border-slate-100 dark:border-slate-800 rotate-3 hover:rotate-0 transition-transform duration-300">
              <FileText className="text-emerald-500" size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. Actionable Plan</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed px-6">
              Get a bulleted management plan or specific drug dosages instantly.
            </p>
          </motion.div>
        </div>

      </div>
    </section>
  );
}

// --- SECTION 2: CORE TOOLS (Bento Grid) ---
export function CoreTools() {
  return (
    <section className="py-24 px-6 bg-slate-50 dark:bg-[#0B1120]/50 border-y border-slate-200 dark:border-white/5">
      <div className="w-full max-w-6xl mx-auto">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            The Clinical Toolbox
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Beyond Q&A. Purpose-built tools for daily ward tasks.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="group bg-white dark:bg-slate-900/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-[var(--umbil-brand-teal)]/30 transition-all hover:shadow-2xl hover:shadow-[var(--umbil-brand-teal)]/5">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <FileText size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Referral Writer</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Convert rough notes into polished, consultant-ready referral letters in seconds.
            </p>
          </div>

          {/* Card 2 */}
          <div className="group bg-white dark:bg-slate-900/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-[var(--umbil-brand-teal)]/30 transition-all hover:shadow-2xl hover:shadow-[var(--umbil-brand-teal)]/5">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-6 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                <Shield size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Safety Net</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Generate robust discharge advice and red flags specifically for your patient.
            </p>
          </div>

          {/* Card 3 */}
          <div className="group bg-white dark:bg-slate-900/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-[var(--umbil-brand-teal)]/30 transition-all hover:shadow-2xl hover:shadow-[var(--umbil-brand-teal)]/5">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mb-6 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                <Activity size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">SBAR Handover</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Structure messy ward events into a clear SBAR format for urgent calls.
            </p>
          </div>

          {/* Card 4 */}
          <div className="group bg-white dark:bg-slate-900/50 backdrop-blur-sm p-8 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-[var(--umbil-brand-teal)]/30 transition-all hover:shadow-2xl hover:shadow-[var(--umbil-brand-teal)]/5">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                <Languages size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Translator</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Simplifies medical jargon into patient-friendly language for better consent.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

// --- SECTION 3: LEARNING ---
export function CaptureLearning() {
  return (
    <section className="py-24 px-6 relative">
      <div className="w-full max-w-4xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-indigo-100 dark:border-indigo-800">
          Automated CPD
        </div>
        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
          Evidence Your Learning <br className="hidden md:block"/> Without the Paperwork
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-2xl mx-auto">
          Umbil passively suggests learning points from your cases. Log them to your portfolio with one click.
        </p>
        
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-[var(--umbil-brand-teal)] font-bold hover:gap-4 transition-all">
          Start building your portfolio <ArrowRight size={20} />
        </Link>
      </div>
    </section>
  );
}

// --- SECTION 4: TRUST FOOTER ---
export function TrustFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-20 px-6 border-t border-slate-900">
      <div className="w-full max-w-6xl mx-auto">
        
        <div className="grid md:grid-cols-3 gap-12 mb-16 border-b border-slate-900 pb-16">
           <div className="flex gap-4">
             <div className="mt-1"><Lock className="text-emerald-500" size={24} /></div>
             <div>
               <h4 className="text-slate-200 font-bold mb-1">Privacy First</h4>
               <p className="text-sm text-slate-500 leading-relaxed">
                 We do not store patient identifiers. Your queries are anonymized.
               </p>
             </div>
           </div>
           <div className="flex gap-4">
             <div className="mt-1"><Stethoscope className="text-emerald-500" size={24} /></div>
             <div>
               <h4 className="text-slate-200 font-bold mb-1">Clinical Safety</h4>
               <p className="text-sm text-slate-500 leading-relaxed">
                 Built by UK doctors. Output allows rapid verification against source text.
               </p>
             </div>
           </div>
           <div className="flex gap-4">
             <div className="mt-1"><CheckCircle2 className="text-emerald-500" size={24} /></div>
             <div>
               <h4 className="text-slate-200 font-bold mb-1">UK Guidelines</h4>
               <p className="text-sm text-slate-500 leading-relaxed">
                 Trained strictly on NICE, CKS, SIGN, and BNF datasets.
               </p>
             </div>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
           <div className="flex items-center gap-2">
             <span className="font-bold text-slate-200 text-lg">Umbil</span>
             <span className="opacity-30">|</span>
             <span className="opacity-50">Built for Doctors by Doctors.</span>
           </div>
           <div className="flex gap-8">
             <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
             <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
             <Link href="mailto:hello@umbil.co.uk" className="hover:text-white transition-colors">Contact</Link>
           </div>
        </div>

        <div className="mt-12 text-[10px] text-center opacity-30 max-w-2xl mx-auto leading-relaxed">
          Disclaimer: Umbil is an AI clinical assistant. It does not replace professional medical judgment. 
          Always verify outputs against official guidelines before making clinical decisions.
        </div>

      </div>
    </footer>
  );
}