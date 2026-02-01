"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  FileText, 
  Shield, 
  Activity, 
  Sparkles
} from "lucide-react";

// --- LIVE DEMO DATA ---
const DEMO_SCENARIOS = [
  {
    id: "referral",
    label: "Referral",
    icon: <FileText className="w-3.5 h-3.5" />,
    input: "54M, dysphagia to solids 6wks. Food sticks mid-chest. 6kg wt loss. Ex-smoker. No haem/melaena. On omeprazole. No scope.",
    output: "Dear Colleague,\n\nI would be grateful for your assessment of this 54-year-old gentleman with a six-week history of progressive dysphagia to solids. He describes food sticking in the mid-chest and has lost approximately 6 kg unintentionally.\n\nHe is an ex-smoker taking omeprazole. There is no history of haematemesis or melaena.\n\nGiven the red flag symptoms, I would appreciate your urgent investigation."
  },
  {
    id: "sbar",
    label: "SBAR",
    icon: <Activity className="w-3.5 h-3.5" />,
    input: "78F on ward. CAP. NEWS 3->6. O2 req 2L->4L. Known COPD. On IV abx. No ABG.",
    output: "Situation\n78-year-old female with CAP. NEWS score increased to 6. Rising oxygen requirements.\n\nBackground\nKnown COPD. On IV antibiotics.\n\nAssessment\nO2 requirement up to 4L. Breathless. No ABG yet.\n\nRecommendation\nUrgent review required. Consider ABG and escalation."
  },
  {
    id: "safetynet",
    label: "Safety Net",
    icon: <Shield className="w-3.5 h-3.5" />,
    input: "Chest discomfort. Normal ECG. No red flags. Conservative mgmt.",
    output: "Advised to seek urgent help if pain becomes severe, prolonged, or associated with breathlessness, collapse, or radiation to arm or jaw.\nTo re-present if symptoms worsen."
  }
];

export default function DemoPhone() {
  const [activeScenario, setActiveScenario] = useState(0);
  const [displayedInput, setDisplayedInput] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  // Typing Effect Logic
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const currentScenario = DEMO_SCENARIOS[activeScenario];
    
    // Reset
    setDisplayedInput("");
    setIsTyping(true);

    let charIndex = 0;
    
    const typeChar = () => {
      if (charIndex < currentScenario.input.length) {
        setDisplayedInput(currentScenario.input.slice(0, charIndex + 1));
        charIndex++;
        // Natural typing speed variation
        timeout = setTimeout(typeChar, 10 + Math.random() * 20); 
      } else {
        setIsTyping(false);
        // Wait longer to read output before switching
        timeout = setTimeout(() => {
          setActiveScenario((prev) => (prev + 1) % DEMO_SCENARIOS.length);
        }, 5000); 
      }
    };

    timeout = setTimeout(typeChar, 500);

    return () => clearTimeout(timeout);
  }, [activeScenario]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative flex justify-center lg:justify-end"
    >
       {/* Glass Device Frame - Sleeker, thinner borders */}
       <div className="relative bg-white dark:bg-slate-950 rounded-[2.5rem] w-full max-w-[360px] h-[680px] shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col overflow-hidden border-[6px] border-slate-100 dark:border-slate-800/80 backdrop-blur-xl transition-colors duration-300">
         
         {/* Top Status Bar Area */}
         <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 backdrop-blur-md z-10">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest">UMBIL AI</div>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500/20"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500/20"></div>
              <div className="w-2 h-2 rounded-full bg-green-500/20"></div>
            </div>
         </div>

         {/* App Interface */}
         <div className="flex-1 overflow-y-auto p-5 flex flex-col bg-slate-50 dark:bg-gradient-to-b dark:from-slate-900 dark:to-slate-950">
            
            {/* Mode Selector */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
              {DEMO_SCENARIOS.map((scenario, idx) => (
                <button
                  key={scenario.id}
                  onClick={() => setActiveScenario(idx)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 border ${
                    activeScenario === idx 
                      ? 'bg-[var(--umbil-brand-teal)]/10 border-[var(--umbil-brand-teal)]/50 text-[var(--umbil-brand-teal)] shadow-sm' 
                      : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {scenario.icon}
                  {scenario.label}
                </button>
              ))}
            </div>

            {/* Input Area */}
            <div className="space-y-2 mb-4 group">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                Raw Notes
                <span className="text-[var(--umbil-brand-teal)]/70 text-[9px]">Paste anywhere</span>
              </label>
              <div className="bg-white dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 text-sm leading-relaxed shadow-sm dark:shadow-inner min-h-[120px] transition-colors group-hover:border-slate-300 dark:group-hover:border-slate-600/50 font-sans">
                {displayedInput}
                <span className="animate-pulse inline-block w-0.5 h-4 bg-[var(--umbil-brand-teal)] align-middle ml-0.5" />
              </div>
            </div>

            {/* Processing Indicator */}
            <div className="flex justify-center my-2">
              <div className={`transition-all duration-500 ${isTyping ? 'opacity-100 scale-100' : 'opacity-30 scale-90'}`}>
                 <div className="w-8 h-8 rounded-full bg-[var(--umbil-brand-teal)]/10 flex items-center justify-center">
                    <ArrowRight className="text-[var(--umbil-brand-teal)] rotate-90" size={14} />
                 </div>
              </div>
            </div>

            {/* Output Area */}
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
               <label className="text-[10px] font-bold text-[var(--umbil-brand-teal)] uppercase tracking-wider flex items-center gap-1.5">
                 <Sparkles size={12} />
                 Formatted Output
               </label>
               <div className="relative flex-1 rounded-xl overflow-hidden border border-[var(--umbil-brand-teal)]/20 bg-[var(--umbil-brand-teal)]/5 dark:bg-gradient-to-br dark:from-[var(--umbil-brand-teal)]/5 dark:to-slate-900/50 shadow-sm dark:shadow-lg">
                  <AnimatePresence mode="wait">
                    {!isTyping && (
                      <motion.div 
                        key={activeScenario}
                        initial={{ opacity: 0, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 p-4 overflow-y-auto text-slate-700 dark:text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-medium"
                      >
                        {DEMO_SCENARIOS[activeScenario].output}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* Typing Loading State */}
                  {isTyping && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm gap-3">
                      <div className="flex gap-1.5">
                        <span className="w-2 h-2 bg-[var(--umbil-brand-teal)] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 bg-[var(--umbil-brand-teal)] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 bg-[var(--umbil-brand-teal)] rounded-full animate-bounce"></span>
                      </div>
                      <span className="text-[10px] text-[var(--umbil-brand-teal)]/70 font-medium uppercase tracking-widest">Generating</span>
                    </div>
                  )}
               </div>
            </div>

            {/* Bottom Nav Hint */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex justify-around text-slate-300 dark:text-slate-600">
               <div className="w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-700/50"></div>
            </div>

         </div>
       </div>
    </motion.div>
  );
}