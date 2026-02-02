"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
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

// --- SECTION 1: HOW IT WORKS (Replaces ProductShowcase) ---
export function HowItWorks() {
  return (
    <section className="py-24 px-6 bg-white dark:bg-slate-900/50">
      <div className="container mx-auto max-w-6xl">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            From Question to Guidance in Seconds
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            A simple workflow designed for busy UK clinicians.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-12 relative">
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
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">1. Ask a Question</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              Type a clinical query naturally. <br/>
              <span className="italic">"Red flags for back pain?"</span> or <br/>
              <span className="italic">"DOAC dosing in renal failure?"</span>
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
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">2. We Search UK Guidance</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              Umbil instantly synthesizes answers from <br/>
              <strong>NICE, CKS, SIGN, and BNF.</strong><br/>
              No US-centric noise.
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
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">3. Use the Result</h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              Get a structured, bulleted summary ready <br/>to use in your management plan <br/>or referral letter.
            </p>
          </motion.div>
        </div>

        {/* Visual Anchor */}
        <div className="mt-20 rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-700 mx-auto max-w-4xl">
           {/* Placeholder for Product Screenshot showing Q&A flow */}
           <Image 
              src="/dashboard-preview-1.png" 
              alt="Umbil Q&A Interface" 
              width={1200} 
              height={800}
              className="w-full h-auto bg-slate-50"
           />
        </div>

      </div>
    </section>
  );
}

// --- SECTION 2: CORE TOOLS (Secondary) ---
export function CoreTools() {
  return (
    <section className="py-24 px-6 bg-slate-50 dark:bg-[#0B1120] border-y border-slate-200 dark:border-white/5">
      <div className="container mx-auto max-w-6xl">
        
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Integrated Workflow Tools
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              Optional tools built directly on top of the clinical engine. <br className="hidden md:block"/>
              Turn your answers into documents instantly.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[var(--umbil-brand-teal)]/50 transition-colors">
            <FileText className="text-slate-400 mb-4" size={24} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Referral Writer</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Turn rough notes into consultant-ready referral letters in your own voice.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[var(--umbil-brand-teal)]/50 transition-colors">
            <Shield className="text-slate-400 mb-4" size={24} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Safety Net</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Generates specific red flags and worsening advice for discharge summaries.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[var(--umbil-brand-teal)]/50 transition-colors">
            <Activity className="text-slate-400 mb-4" size={24} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">SBAR Handover</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Structure messy ward notes into a clear SBAR format for calls/referrals.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[var(--umbil-brand-teal)]/50 transition-colors">
            <Languages className="text-slate-400 mb-4" size={24} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Translator</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Convert complex medical jargon into simple patient-friendly language.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

// --- SECTION 3: LEARNING (Minimal) ---
export function CaptureLearning() {
  return (
    <section className="py-20 px-6">
      <div className="container mx-auto max-w-4xl text-center">
        <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
          Bonus Feature
        </div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">
          Capture Learning Without Extra Work
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-8 max-w-2xl mx-auto">
          Every clinical question you ask is an opportunity to log CPD. 
          Umbil automatically suggests learning points and reflection entries 
          for your appraisal, so you never have to panic-log at the end of the year.
        </p>
      </div>
    </section>
  );
}

// --- SECTION 4: TRUST STRIP & FOOTER ---
export function TrustFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-16 px-6 border-t border-slate-800">
      <div className="container mx-auto max-w-5xl">
        
        {/* Trust Strip */}
        <div className="grid md:grid-cols-3 gap-8 pb-12 border-b border-slate-800 mb-12">
           <div className="flex gap-4">
             <div className="mt-1"><Lock className="text-emerald-500" size={20} /></div>
             <div>
               <h4 className="text-slate-200 font-bold mb-1">Privacy First</h4>
               <p className="text-sm text-slate-500">
                 No patient identifiable data is ever required or stored.
               </p>
             </div>
           </div>
           <div className="flex gap-4">
             <div className="mt-1"><Stethoscope className="text-emerald-500" size={20} /></div>
             <div>
               <h4 className="text-slate-200 font-bold mb-1">Clinical Safety</h4>
               <p className="text-sm text-slate-500">
                 You remain responsible for all clinical decisions. Umbil is a support tool.
               </p>
             </div>
           </div>
           <div className="flex gap-4">
             <div className="mt-1"><CheckCircle2 className="text-emerald-500" size={20} /></div>
             <div>
               <h4 className="text-slate-200 font-bold mb-1">UK Guidance</h4>
               <p className="text-sm text-slate-500">
                 Trained specifically on NICE, CKS, SIGN, and BNF datasets.
               </p>
             </div>
           </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-sm">
           <div className="flex items-center gap-2">
             <span className="font-bold text-slate-200">Umbil</span>
             <span className="opacity-50">| Built for Doctors by Doctors.</span>
           </div>
           <div className="flex gap-6">
             <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
             <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
             <Link href="mailto:hello@umbil.co.uk" className="hover:text-white transition-colors">Contact</Link>
           </div>
        </div>

        <div className="mt-8 text-xs text-center opacity-30 max-w-2xl mx-auto">
          Disclaimer: Umbil is an AI clinical assistant. It does not replace professional medical judgment. 
          Always verify outputs against official guidelines before making clinical decisions.
        </div>

      </div>
    </footer>
  );
}