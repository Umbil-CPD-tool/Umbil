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
             <Link href="mailto:masteringmedicineltd@gmail.com" className="hover:text-white transition-colors">Contact</Link>
           </div>
        </div>

        <div className="mt-10 text-xs text-center opacity-30 max-w-2xl mx-auto leading-relaxed mb-8">
          Disclaimer: Umbil is an AI clinical assistant. It does not replace professional medical judgment. 
          Always verify outputs against official guidelines before making clinical decisions.
        </div>
        
        {/* Social Media Icons */}
        <div className="flex justify-center gap-6 border-t border-slate-800/50 pt-8">
            <a href="https://www.instagram.com/umbil_ai/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors" aria-label="Follow on Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61565964025530&locale=be_BY" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors" aria-label="Follow on Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.797 1.651-2.797 4.16v1.812h3.309l-1.337 3.667h-1.972v7.98H9.101Z"/></svg>
            </a>
            <a href="https://uk.linkedin.com/company/umbil" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors" aria-label="Follow on LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>
            </a>
            <a href="https://www.tiktok.com/@umbil_ai" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-white transition-colors" aria-label="Follow on TikTok">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
            </a>
        </div>

      </div>
    </footer>
  );
}