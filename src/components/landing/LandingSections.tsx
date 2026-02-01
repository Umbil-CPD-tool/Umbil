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
  Search
} from "lucide-react";

export function ProductShowcase() {
  return (
    <section className="px-6 overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <motion.div 
           initial={{ opacity: 0, y: 40 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8 }}
           className="relative"
        >
          {/* Tilted Perspective Container */}
          <div className="relative group perspective-[2000px] mt-10">
             {/* Glow behind image */}
             <div className="absolute -inset-1 bg-gradient-to-r from-[var(--umbil-brand-teal)] to-indigo-500 rounded-xl blur-2xl opacity-10 dark:opacity-20 group-hover:opacity-20 dark:group-hover:opacity-30 transition duration-1000"></div>
             
             {/* Main Dashboard Image */}
             <div className="relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-2xl overflow-hidden transform transition-transform duration-700 group-hover:rotate-x-2 group-hover:scale-[1.01]">
                <Image 
                  src="/dashboard-preview-1.png" 
                  alt="Umbil Dashboard Interface" 
                  width={1400} 
                  height={900}
                  className="w-full h-auto object-cover"
                />
                
                {/* Overlay Gradient for depth (Dark mode only) */}
                <div className="absolute inset-0 dark:bg-gradient-to-t dark:from-slate-950/80 dark:via-transparent dark:to-transparent pointer-events-none"></div>
             </div>

             {/* Floating Mobile Image (Parallax) */}
             <div className="block absolute -bottom-6 -right-4 lg:-bottom-10 lg:-right-10 w-[140px] lg:w-[240px] rounded-[1.2rem] lg:rounded-[2rem] border-[3px] lg:border-[4px] border-white dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl transform rotate-[-6deg] translate-y-6 lg:translate-y-10 group-hover:translate-y-4 lg:group-hover:translate-y-6 transition duration-700">
                <Image 
                  src="/dashboard-preview-2.png" 
                  alt="Umbil Mobile Interface" 
                  width={300} 
                  height={600}
                  className="w-full h-auto rounded-[1rem] lg:rounded-[1.8rem]"
                />
             </div>
          </div>

          {/* Guideline Summaries - Increased margin top to prevent overlap */}
          <div className="mt-56 text-center">
             <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
               Get summaries based on UK sources (NICE/CKS/SIGN/BNF).
             </p>
             
             <div className="flex flex-wrap justify-center gap-4">
               {[
                 "Red flags for headache?", 
                 "Management of CAP in elderly?", 
                 "DOAC dosing for AF with renal impairment?"
               ].map((q, i) => (
                 <div key={i} className="flex items-center gap-3 px-6 py-4 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-full text-base font-medium text-slate-700 dark:text-slate-200 hover:border-[var(--umbil-brand-teal)]/50 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-default shadow-sm dark:shadow-lg">
                   <Search size={16} className="text-[var(--umbil-brand-teal)]" />
                   {q}
                 </div>
               ))}
             </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function CoreTools() {
  return (
    // Increased padding to separate from section above
    <section className="py-24 px-6 bg-slate-50 dark:bg-slate-900/30 border-y border-slate-200 dark:border-white/5 backdrop-blur-sm">
      <div className="container mx-auto max-w-6xl">
        
        {/* ADDED LABEL HEADER */}
        <div className="mb-16 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white">
            Clinical Tools
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          <motion.div whileHover={{ y: -8 }} className="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-[var(--umbil-brand-teal)]/30 shadow-lg shadow-slate-200/50 dark:shadow-none dark:hover:shadow-[var(--umbil-brand-teal)]/20 transition-all group">
            <div className="w-12 h-12 bg-[var(--umbil-brand-teal)]/10 rounded-xl flex items-center justify-center text-[var(--umbil-brand-teal)] mb-6 group-hover:scale-110 transition-transform">
              <FileText size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Referral Writer</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Turn shorthand notes into consultant-ready letters in your own voice.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -8 }} className="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-rose-500/30 shadow-lg shadow-slate-200/50 dark:shadow-none dark:hover:shadow-rose-900/20 transition-all group">
            <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-400 mb-6 group-hover:scale-110 transition-transform">
              <Shield size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Safety Net</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Generates 4 crisp red flags and specific advice for the patient.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -8 }} className="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-emerald-500/30 shadow-lg shadow-slate-200/50 dark:shadow-none dark:hover:shadow-emerald-900/20 transition-all group">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
              <Activity size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">SBAR Handover</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Instantly structure messy ward notes into a clear SBAR for referrals.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -8 }} className="bg-white dark:bg-slate-900/50 p-8 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-blue-500/30 shadow-lg shadow-slate-200/50 dark:shadow-none dark:hover:shadow-blue-900/20 transition-all group">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
              <Languages size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Translator</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
              Convert complex medical jargon into simple, patient-friendly language.
            </p>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

export function CaptureLearning() {
  return (
    <section className="py-10 px-6 relative overflow-hidden">
      {/* Decorative background blob */}
      <div className="absolute right-0 top-1/4 w-[800px] h-[800px] bg-indigo-100 dark:bg-indigo-900/10 rounded-full blur-[120px] -z-10"></div>

      <div className="container mx-auto max-w-6xl">
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur-md rounded-3xl p-8 md:p-20 text-slate-900 dark:text-white overflow-hidden relative shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-16">
          
          {/* Content */}
          <div className="relative z-10 flex-1">
            <div className="inline-block px-4 py-1.5 bg-[var(--umbil-brand-teal)]/10 border border-[var(--umbil-brand-teal)]/20 rounded-full text-[var(--umbil-brand-teal)] text-xs font-bold mb-8 tracking-wide">
              AUTOMATED CPD
            </div>
            <h3 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">Capture Learning <br/>Without Trying.</h3>
            <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed mb-10">
              Turn clinical work into structured learning entries instantly. End the midnight appraisal panic forever.
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-4 text-base font-medium text-slate-700 dark:text-slate-300">
                <div className="w-6 h-6 rounded-full bg-[var(--umbil-brand-teal)]/20 flex items-center justify-center text-[var(--umbil-brand-teal)]"><CheckCircle2 size={14} /></div>
                Log learning from real cases
              </li>
              <li className="flex items-center gap-4 text-base font-medium text-slate-700 dark:text-slate-300">
                <div className="w-6 h-6 rounded-full bg-[var(--umbil-brand-teal)]/20 flex items-center justify-center text-[var(--umbil-brand-teal)]"><CheckCircle2 size={14} /></div>
                One-click reflection assistant
              </li>
              <li className="flex items-center gap-4 text-base font-medium text-slate-700 dark:text-slate-300">
                <div className="w-6 h-6 rounded-full bg-[var(--umbil-brand-teal)]/20 flex items-center justify-center text-[var(--umbil-brand-teal)]"><CheckCircle2 size={14} /></div>
                Exports to appraisal PDF & SOAR
              </li>
            </ul>
          </div>

          {/* Visual: Floating Card */}
          <div className="relative z-10 w-full md:w-[380px] bg-slate-50 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 p-8 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-2xl transform md:rotate-3 transition-transform hover:rotate-0 group">
             <div className="absolute top-0 right-0 p-4 opacity-5 dark:opacity-10">
                <FileText size={100} />
             </div>
             <div className="flex items-center gap-4 mb-6 border-b border-slate-200 dark:border-white/5 pb-6">
               <div className="w-12 h-12 rounded-full bg-[var(--umbil-brand-teal)] flex items-center justify-center text-white dark:text-slate-900 font-bold shadow-lg shadow-teal-500/20">
                 <CheckCircle2 size={24} />
               </div>
               <div>
                 <div className="text-base font-bold text-slate-900 dark:text-white">Learning Captured</div>
                 <div className="text-xs text-slate-500 dark:text-slate-400">Just now • Clinical Management</div>
               </div>
             </div>
             <div className="space-y-4 opacity-30 dark:opacity-50">
               <div className="h-2 bg-slate-400 rounded w-3/4"></div>
               <div className="h-2 bg-slate-400 rounded w-full"></div>
               <div className="h-2 bg-slate-400 rounded w-5/6"></div>
             </div>
             <div className="mt-8 flex gap-2">
               <div className="text-[10px] font-bold text-slate-500 dark:text-slate-300 bg-slate-200 dark:bg-white/5 border border-transparent dark:border-white/5 px-3 py-1.5 rounded-full">Domain 1</div>
               <div className="text-[10px] font-bold text-slate-500 dark:text-slate-300 bg-slate-200 dark:bg-white/5 border border-transparent dark:border-white/5 px-3 py-1.5 rounded-full">Domain 2</div>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    // Removed border-t and background to blend with above. Reduced padding-top.
    <section className="pb-32 pt-10 px-6">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center">
        {/* Simplified container - removed heavy borders and animations */}
        <div className="w-full">
          <p className="text-2xl md:text-3xl text-slate-800 dark:text-white mb-10 font-bold tracking-tight">
            Open a tab. Start typing.<br/>
            <span className="text-[var(--umbil-brand-teal)]">No installation required.</span>
          </p>
          <Link href="/dashboard" className="w-full sm:w-auto px-10 py-5 bg-[var(--umbil-brand-teal)] hover:bg-teal-600 !text-white text-xl font-bold rounded-sm shadow-xl inline-flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]">
            Start Free Now <ArrowRight size={24} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 text-slate-500 py-16 px-6 border-t border-slate-200 dark:border-white/5">
      <div className="container mx-auto max-w-7xl flex flex-col items-center gap-8">
         <div className="text-sm opacity-50 font-medium">
           © {new Date().getFullYear()} Umbil. Built for Doctors by Doctors.
         </div>
      </div>
    </footer>
  );
}