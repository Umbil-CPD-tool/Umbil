// src/components/LandingPage.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUserEmail } from "@/hooks/useUser";

export default function LandingPage() {
  const { email, loading } = useUserEmail();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  // Typewriter Effect State
  const [typedText, setTypedText] = useState("");
  const fullText = "87F from nursing home. Fall + confusion.\nO/E: dry mucous membranes, tachycardia 110.\nUrine dip: Leuk+++ Nit+.\nPlan: IV fluids, start gent/amox, admit gerries.";

  // Redirect logged-in users to the Dashboard
  useEffect(() => {
    if (!loading && email) {
      router.replace("/dashboard");
    }
  }, [loading, email, router]);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Run Typewriter Animation
  useEffect(() => {
    let index = 0;
    const speed = 40; // typing speed in ms
    const delayBeforeStart = 500; // ms

    const timeoutId = setTimeout(() => {
      const intervalId = setInterval(() => {
        setTypedText(fullText.slice(0, index));
        index++;
        if (index > fullText.length) {
          clearInterval(intervalId);
        }
      }, speed);
      return () => clearInterval(intervalId);
    }, delayBeforeStart);

    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#1fb8cd] selection:text-white">
      
      {/* --- NAVIGATION --- */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-slate-100 py-3' : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-6 max-w-6xl flex justify-between items-center">
          <div className="flex items-center gap-2">
             {/* Simple Logo Placeholder */}
            <div className="w-8 h-8 bg-[#1fb8cd] rounded-lg flex items-center justify-center text-white font-bold text-xl">U</div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Umbil</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/auth" className="hidden md:block text-sm font-medium text-slate-600 hover:text-[#1fb8cd] transition-colors">
              Log in
            </Link>
            <Link href="/auth" className="bg-[#0f172a] hover:bg-[#1fb8cd] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION: WORKFLOW RELIEF --- */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        
        {/* Abstract Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-100/40 via-white to-white -z-10 pointer-events-none"></div>

        <div className="container mx-auto px-6 max-w-5xl text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-100 text-[#0e7490] text-xs font-bold uppercase tracking-wide mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="w-2 h-2 rounded-full bg-[#1fb8cd] animate-pulse"></span>
            New: SBAR Handover Generator
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.1]">
            Survive your <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1fb8cd] to-[#0e7490]">
              on-call shift.
            </span>
          </h1>

          <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop drowning in admin. Umbil instantly drafts your <strong>SBAR handovers</strong>, <strong>referral letters</strong>, and <strong>patient explanations</strong> so you can focus on the patient in front of you.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-[#1fb8cd] hover:bg-[#159aac] text-white text-lg font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all transform hover:-translate-y-1">
              Start Free Trial
            </Link>
            <Link href="/dashboard?tour=true" className="w-full sm:w-auto px-8 py-4 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-lg font-medium rounded-xl transition-all hover:bg-slate-50">
              See How It Works
            </Link>
          </div>

          {/* --- HERO UI MOCKUP --- */}
          <div className="relative mx-auto max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200/60 p-2 md:p-4 animate-in fade-in zoom-in-95 duration-1000 delay-200">
            <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              {/* Fake Browser Header */}
              <div className="h-8 border-b border-slate-200 bg-white flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              {/* Fake UI Content */}
              <div className="p-6 md:p-10 grid md:grid-cols-2 gap-8 text-left">
                {/* Left: Input (Typewriter) */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinician Notes</div>
                    <div className="flex items-center gap-1 text-xs text-red-500 font-bold animate-pulse">
                      <span>●</span> REC
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-slate-200 text-slate-600 text-sm font-mono leading-relaxed h-full relative min-h-[140px] shadow-sm">
                    {typedText}
                    <span className="w-2 h-4 bg-[#1fb8cd] inline-block ml-1 animate-pulse align-middle"></span>
                    
                    {/* Floating Mic Icon */}
                    <div className="absolute bottom-3 right-3 text-slate-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                    </div>
                  </div>
                </div>

                {/* Right: Output (SBAR) */}
                <div className="space-y-4 relative">
                   <div className="absolute -left-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-md border border-slate-100 z-10 hidden md:block">
                      <svg className="w-5 h-5 text-[#1fb8cd]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                   </div>
                  <div className="text-xs font-bold text-[#1fb8cd] uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Instant SBAR Output
                  </div>
                  <div className="bg-slate-900 p-5 rounded-lg border border-slate-800 text-slate-300 text-sm leading-relaxed shadow-lg transition-opacity duration-500">
                     {/* Show output only after some typing */}
                     <div className={typedText.length > 50 ? "opacity-100 transition-opacity duration-700" : "opacity-30 blur-[2px]"}>
                        <span className="text-cyan-400 font-bold">S - Situation:</span> Admitting 87F with urosepsis and dehydration.<br/><br/>
                        <span className="text-cyan-400 font-bold">B - Background:</span> Nursing home resident. Fall secondary to confusion.<br/><br/>
                        <span className="text-cyan-400 font-bold">A - Assessment:</span> Tachycardic (110), dry membranes. Urine dip indicative of infection (Leuk+++/Nit+).<br/><br/>
                        <span className="text-cyan-400 font-bold">R - Recommendation:</span> Commenced IV Fluids + Antibiotics. Refer to Geriatrics.
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* --- NHS / TRUST BADGES (Social Proof) --- */}
      <div className="w-full overflow-hidden bg-slate-50 py-10 border-y border-slate-100">
        <div className="container mx-auto px-6 text-center">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-6">Trusted by clinicians at</p>
            <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                {/* Placeholders for logos - replace with real SVGs if available */}
                <div className="text-xl font-bold text-slate-700 flex items-center gap-2"><span className="text-blue-600 text-2xl">NHS</span> England</div>
                <div className="text-xl font-bold text-slate-700 flex items-center gap-2"><span className="text-blue-600 text-2xl">NHS</span> Scotland</div>
                <div className="text-xl font-bold text-slate-700 flex items-center gap-2">Cleveland Clinic</div>
                <div className="text-xl font-bold text-slate-700 flex items-center gap-2">BUPA</div>
            </div>
        </div>
      </div>

      {/* --- FEATURES GRID: CLINICAL TOOLS FIRST --- */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
              Tools built for the bedside, <br/>not the boardroom.
            </h2>
            <p className="text-lg text-slate-600">
              Most platforms are built for managers. Umbil is built for you, the clinician holding the bleep at 3 AM.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-2xl">
                📋
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">SBAR & Referrals</h3>
              <p className="text-slate-500 leading-relaxed">
                Turn shorthand notes into structured <strong>SBAR handovers</strong> or formal GP letters in one click. Ensure nothing gets missed during transfer of care.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6 text-2xl">
                🛡️
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Safety Netting</h3>
              <p className="text-slate-500 leading-relaxed">
                Instantly generate robust, medico-legal <strong>safety netting advice</strong> for patients. Document exactly what you told them to watch out for.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-shadow duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-2xl">
                🗣️
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Patient Translator</h3>
              <p className="text-slate-500 leading-relaxed">
                Need to explain <em>"Atrial Fibrillation"</em>? Umbil rewrites complex medical jargon into clear, <strong>5th-grade English</strong> for your patients.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* --- THE "MAGIC TRICK" (Passive CPD) --- */}
      <section className="py-24 bg-slate-900 text-white overflow-hidden relative">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#1fb8cd]/10 to-transparent pointer-events-none"></div>

        <div className="container mx-auto px-6 max-w-6xl relative z-10 flex flex-col md:flex-row items-center gap-16">
          
          <div className="flex-1">
            <div className="text-[#1fb8cd] font-bold tracking-wider uppercase text-sm mb-4">The Invisible Benefit</div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              You do the work. <br/>
              We catch the CPD.
            </h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              Every time you check a guideline, write a referral, or clarify a diagnosis in Umbil, we verify it.
            </p>
            
            <ul className="space-y-5">
              <li className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-[#1fb8cd]/20 flex items-center justify-center text-[#1fb8cd]">✓</div>
                <div>
                  <strong className="block text-white">Zero Admin</strong>
                  <span className="text-slate-400 text-sm">No more "logging learning" on Sunday nights. It's already done.</span>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-1 w-6 h-6 rounded-full bg-[#1fb8cd]/20 flex items-center justify-center text-[#1fb8cd]">✓</div>
                <div>
                  <strong className="block text-white">Appraisal Ready</strong>
                  <span className="text-slate-400 text-sm">Export a full portfolio of your clinical curiosity instantly.</span>
                </div>
              </li>
            </ul>
          </div>

          <div className="flex-1 w-full">
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl relative">
              {/* Floating Badge */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                AUTO-SAVED
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end border-b border-slate-700 pb-4">
                  <div>
                    <div className="text-xs text-slate-400 uppercase">Recent Activity</div>
                    <div className="text-lg font-semibold text-white">Umbil Timeline</div>
                  </div>
                  <div className="text-[#1fb8cd] font-bold text-2xl">24 mins</div>
                </div>

                {/* Timeline Items */}
                <div className="space-y-3">
                  <div className="bg-slate-700/50 p-3 rounded-lg flex gap-3 items-center">
                    <span className="text-xl">💊</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">Deep Dive: Hyperkalemia Mgmt</div>
                      <div className="text-xs text-slate-400">Clinical Query • 10 mins</div>
                    </div>
                  </div>
                  <div className="bg-slate-700/50 p-3 rounded-lg flex gap-3 items-center">
                    <span className="text-xl">📝</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">Generated SBAR for Sepsis</div>
                      <div className="text-xs text-slate-400">Tool Usage • 5 mins</div>
                    </div>
                  </div>
                   <div className="bg-slate-700/50 p-3 rounded-lg flex gap-3 items-center opacity-60">
                    <span className="text-xl">🔍</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">NICE Search: Asthma in Children</div>
                      <div className="text-xs text-slate-400">Knowledge Retrieval</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* --- FOOTER CTA --- */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
            Ready to reclaim your time?
          </h2>
          <p className="text-lg text-slate-500 mb-10 max-w-xl mx-auto">
            Join thousands of UK clinicians using Umbil to handle the pressure of modern practice.
          </p>
          <Link href="/auth" className="inline-block px-10 py-4 bg-[#1fb8cd] hover:bg-[#159aac] text-white text-xl font-bold rounded-xl shadow-lg transition-transform transform hover:scale-105">
            Get Started Now
          </Link>
          <div className="mt-8 text-sm text-slate-400">
            No credit card required • GDPR Compliant
          </div>
        </div>
      </section>

      <footer className="bg-slate-50 border-t border-slate-200 py-12 text-sm text-slate-500">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>&copy; {new Date().getFullYear()} Umbil. Built for the NHS.</div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
            <Link href="/contact" className="hover:text-slate-900">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}