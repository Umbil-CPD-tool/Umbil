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
  Lock
} from "lucide-react";

// --- SECTION 1: HOW IT WORKS ---
export function HowItWorks() {
  return (
    <section className="!py-20 md:!py-40 px-6 bg-white dark:bg-slate-900/50">
      <div className="w-full max-w-6xl mx-auto">
        
        <div className="text-center mb-16 md:mb-24">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            From Question to Guidance in Seconds
          </h2>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            A simple workflow designed for busy UK clinicians.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative mb-20 md:mb-32">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-slate-100 dark:bg-slate-800 -z-10"></div>

          {/* Step 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center group"
          >
            <div className="w-24 h-24 bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-700/50 rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:border-[var(--umbil-brand-teal)]/30 transition-colors">
              <Search className="text-[var(--umbil-brand-teal)]" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">1. Ask a Question</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed px-4">
              Ask a clinical question in plain English. <br/>
              <span className="italic opacity-80">"Red flags for back pain?"</span>
            </p>
          </motion.div>

          {/* Step 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center text-center group"
          >
            <div className="w-24 h-24 bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-700/50 rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:border-[var(--umbil-brand-teal)]/30 transition-colors">
              <BookOpen className="text-[var(--umbil-brand-teal)]" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">2. Umbil Synthesises Guidance</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed px-4">
              Instant answers sourced strictly from <br/>
              <strong>NICE, CKS, SIGN, and BNF.</strong>
            </p>
          </motion.div>

          {/* Step 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center text-center group"
          >
            <div className="w-24 h-24 bg-white dark:bg-slate-800 border-4 border-slate-50 dark:border-slate-700/50 rounded-full flex items-center justify-center mb-6 shadow-sm group-hover:border-[var(--umbil-brand-teal)]/30 transition-colors">
              <FileText className="text-[var(--umbil-brand-teal)]" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">3. Get a Structured Answer</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed px-4">
              A clear, bulleted summary ready to use <br/> in your management plan.
            </p>
          </motion.div>
        </div>

        {/* Visual Anchor - Product Screenshot */}
        <div className="mt-12 rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 mx-auto max-w-4xl bg-slate-50 dark:bg-slate-800">
           <Image 
              src="/dashboard-preview-1.png" 
              alt="Umbil Clinical Answer Example: Red Flags for Back Pain" 
              width={1200} 
              height={800}
              className="w-full h-auto"
           />
        </div>

      </div>
    </section>
  );
}

// --- SECTION 2: CORE TOOLS (Secondary) ---
export function CoreTools() {
  return (
    <section className="!py-20 md:!py-40 px-6 bg-slate-50 dark:bg-[#0B1120] border-y border-slate-200 dark:border-white/5">
      <div className="w-full max-w-6xl mx-auto">
        
        {/* CENTERED HEADER */}
        <div className="text-center mb-16 md:mb-24">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Integrated Workflow Tools
          </h2>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Optional tools built directly on top of the clinical engine.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* CARDS CENTERED */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[var(--umbil-brand-teal)]/50 transition-colors flex flex-col items-center text-center">
            <FileText className="text-slate-400 mb-4" size={28} />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Referral Writer</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Turn rough notes into consultant-ready referral letters in your own voice.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[var(--umbil-brand-teal)]/50 transition-colors flex flex-col items-center text-center">
            <Shield className="text-slate-400 mb-4" size={28} />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Safety Net</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Generates specific red flags and worsening advice for discharge summaries.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[var(--umbil-brand-teal)]/50 transition-colors flex flex-col items-center text-center">
            <Activity className="text-slate-400 mb-4" size={28} />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">SBAR Handover</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Structure messy ward notes into a clear SBAR format for calls/referrals.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[var(--umbil-brand-teal)]/50 transition-colors flex flex-col items-center text-center">
            <Languages className="text-slate-400 mb-4" size={28} />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Translator</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Convert complex medical jargon into simple patient-friendly language.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

// --- SECTION 3: LEARNING (Passive/Premium) ---
export function CaptureLearning() {
  return (
    <section className="!py-20 md:!py-40 px-6">
      <div className="w-full max-w-4xl mx-auto text-center">
        <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 rounded-sm text-xs font-bold uppercase tracking-wider mb-6">
          Automatic CPD
        </div>
        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
          Capture Learning Without Extra Work
        </h2>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-8 max-w-2xl mx-auto">
          Every clinical question you ask is an opportunity to log CPD. 
          Umbil passively suggests learning points and reflection entries, 
          so your appraisal evidence builds itself in the background.
        </p>
      </div>
    </section>
  );
}

// --- SECTION 4: TRUST STRIP & FOOTER ---
export function TrustFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-16 px-6 border-t border-slate-800">
      <div className="w-full max-w-5xl mx-auto text-center">
        
        {/* Trust Strip - Centered Vertical Stacks */}
        <div className="grid md:grid-cols-3 gap-12 pb-12 border-b border-slate-800 mb-12">
           <div className="flex flex-col items-center gap-3">
             <div className="p-3 bg-slate-900 rounded-full"><Lock className="text-emerald-500" size={24} /></div>
             <div>
               <h4 className="text-slate-200 font-bold mb-1">Privacy First</h4>
               <p className="text-sm text-slate-500">
                 No patient identifiable data is ever required.
               </p>
             </div>
           </div>
           <div className="flex flex-col items-center gap-3">
             <div className="p-3 bg-slate-900 rounded-full"><Stethoscope className="text-emerald-500" size={24} /></div>
             <div>
               <h4 className="text-slate-200 font-bold mb-1">Clinical Safety</h4>
               <p className="text-sm text-slate-500">
                 You remain responsible for all clinical decisions.
               </p>
             </div>
           </div>
           <div className="flex flex-col items-center gap-3">
             <div className="p-3 bg-slate-900 rounded-full"><CheckCircle2 className="text-emerald-500" size={24} /></div>
             <div>
               <h4 className="text-slate-200 font-bold mb-1">UK Guidance</h4>
               <p className="text-sm text-slate-500">
                 Trained specifically on NICE, CKS, SIGN, and BNF datasets.
               </p>
             </div>
           </div>
        </div>

        {/* Footer Links - Centered */}
        <div className="flex flex-col items-center gap-6 text-sm">
           <div className="flex items-center gap-2">
             <span className="font-bold text-slate-200 text-lg">Umbil</span>
             <span className="opacity-50">| Built for Doctors by Doctors.</span>
           </div>
           <div className="flex gap-8">
             <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
             <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
             <Link href="mailto:hello@umbil.co.uk" className="hover:text-white transition-colors">Contact</Link>
           </div>
        </div>

        <div className="mt-10 text-xs text-center opacity-30 max-w-2xl mx-auto leading-relaxed">
          Disclaimer: Umbil is an AI clinical assistant. It does not replace professional medical judgment. 
          Always verify outputs against official guidelines before making clinical decisions.
        </div>

      </div>
    </footer>
  );
}