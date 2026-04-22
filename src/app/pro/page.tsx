// src/app/pro/page.tsx
"use client";

import { useState } from "react";
import { Check, Sparkles, GraduationCap, Stethoscope, User, X, CreditCard, Zap, FileText } from "lucide-react";
import MainWrapper from "@/components/MainWrapper";
import { useUserEmail } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  
  const { email, isPro, loading } = useUserEmail();
  const router = useRouter();

  // Test Mode Stripe Price IDs
  const STRIPE_PRICES = {
    standard_monthly: "price_1TP7kkEwbwdYfgj4MikPURey",
    standard_annual: "price_1TP7y1EwbwdYfgj4Wy474Sv5",
    msf: "price_1TP7kUEwbwdYfgj4szYtHR6X",
    psq: "price_1TP7jXEwbwdYfgj4N0WnPBLq",
  };

  const handleCheckout = async () => {
    if (!email) {
      router.push('/auth?redirect=/pro');
      return;
    }
    
    setIsCheckingOut(true);
    const priceId = isAnnual ? STRIPE_PRICES.standard_annual : STRIPE_PRICES.standard_monthly;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ priceId, planType: `standard_${isAnnual ? 'annual' : 'monthly'}` }),
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Something went wrong initiating checkout.");
        setIsCheckingOut(false);
      }
    } catch (error) {
      console.error(error);
      setIsCheckingOut(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        }
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Could not open billing portal.");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  if (loading) return null;

  // --- PRO DASHBOARD (If already subscribed) ---
  if (isPro) {
    return (
      <MainWrapper>
        <div className="max-w-4xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-50 text-[var(--umbil-brand-teal)] mb-6 shadow-sm border border-teal-100">
              <Sparkles className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-[var(--umbil-text)]">
              Thank you for being a Pro!
            </h1>
            <p className="text-xl text-[var(--umbil-muted)]">
              Your account is fully upgraded. You have unlocked zero limits and advanced features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
              <Zap className="w-8 h-8 text-yellow-500 mb-3" />
              <h3 className="font-bold text-[var(--umbil-text)] mb-2">Deep Dive AI</h3>
              <p className="text-sm text-[var(--umbil-muted)]">Unlimited advanced logic reasoning for complex clinical scenarios.</p>
            </div>
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
              <FileText className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="font-bold text-[var(--umbil-text)] mb-2">Unlimited Appraisals</h3>
              <p className="text-sm text-[var(--umbil-muted)]">Generate as many PSQ and MSF cycles as you need per year.</p>
            </div>
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
              <Stethoscope className="w-8 h-8 text-[var(--umbil-brand-teal)] mb-3" />
              <h3 className="font-bold text-[var(--umbil-text)] mb-2">Unlimited Tools</h3>
              <p className="text-sm text-[var(--umbil-muted)]">Zero daily limits on generating reflections, letters, and patient leaflets.</p>
            </div>
          </div>

          <div className="flex justify-center">
             <button 
                onClick={handleManageSubscription}
                disabled={isPortalLoading}
                className="flex items-center gap-2 px-8 py-4 bg-[var(--umbil-surface)] border border-[var(--umbil-divider)] text-[var(--umbil-text)] font-bold rounded-xl hover:bg-[var(--umbil-hover-bg)] transition-all shadow-sm disabled:opacity-50"
             >
                <CreditCard size={20} className="text-[var(--umbil-brand-teal)]" />
                {isPortalLoading ? "Opening Portal..." : "Manage Subscription & Billing"}
             </button>
          </div>
        </div>
      </MainWrapper>
    );
  }

  // --- PRICING PAGE (If Free) ---
  return (
    <MainWrapper>
      <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight" style={{ color: 'var(--umbil-text)' }}>
            Supercharge your clinical workflow.
          </h1>
          <p className="text-xl" style={{ color: 'var(--umbil-muted)' }}>
            Basic Q&A will always be free. Upgrade to Pro to remove all daily limits, unlock Deep Dive AI reasoning, and generate unlimited PSQs.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-16">
          <div className="p-1 rounded-xl inline-flex shadow-inner border" style={{ backgroundColor: 'var(--umbil-card-border)', borderColor: 'var(--umbil-divider)' }}>
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${!isAnnual ? 'shadow-md' : 'opacity-70 hover:opacity-100'}`}
              style={{ 
                backgroundColor: !isAnnual ? 'var(--umbil-surface)' : 'transparent',
                color: !isAnnual ? 'var(--umbil-text)' : 'var(--umbil-muted)' 
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'shadow-md' : 'opacity-70 hover:opacity-100'}`}
              style={{ 
                backgroundColor: isAnnual ? 'var(--umbil-surface)' : 'transparent',
                color: isAnnual ? 'var(--umbil-text)' : 'var(--umbil-muted)' 
              }}
            >
              Annually 
              <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold tracking-wide" style={{ backgroundColor: 'rgba(31, 184, 205, 0.15)', color: '#1fb8cd' }}>
                SAVE 16%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards - 2 Column Layout */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto items-center">
          
          {/* 1. FREE PLAN */}
          <div className="border rounded-3xl p-8 shadow-sm flex flex-col h-full" style={{ backgroundColor: 'var(--umbil-surface)', borderColor: 'var(--umbil-divider)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--umbil-card-border)' }}>
                <User className="w-6 h-6" style={{ color: 'var(--umbil-muted)' }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--umbil-text)' }}>Free</h2>
            </div>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--umbil-muted)' }}>Perfect for trying out Umbil&apos;s core medical knowledge base.</p>
            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold" style={{ color: 'var(--umbil-text)' }}>£0</span>
              </div>
              <div className="text-sm mt-1 font-medium" style={{ color: 'var(--umbil-muted)' }}>Forever free</div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-50" style={{ color: 'var(--umbil-text)' }} />
                <span style={{ color: 'var(--umbil-text)' }}>Standard Clinical Q&A</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-50" style={{ color: 'var(--umbil-text)' }} />
                <span style={{ color: 'var(--umbil-text)' }}><strong>3</strong> Capture Learning logs / day</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-50" style={{ color: 'var(--umbil-text)' }} />
                <span style={{ color: 'var(--umbil-text)' }}><strong>3</strong> Tool generations / day</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 opacity-50" style={{ color: 'var(--umbil-text)' }} />
                <span style={{ color: 'var(--umbil-text)' }}><strong>1</strong> PSQ generation / year</span>
              </li>
              <li className="flex items-start gap-3 opacity-50">
                <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="line-through" style={{ color: 'var(--umbil-muted)' }}>Deep Dive AI reasoning</span>
              </li>
            </ul>

            <button
              disabled
              className="w-full py-3.5 px-4 rounded-xl font-bold transition-all border"
              style={{ backgroundColor: 'var(--umbil-hover-bg)', color: 'var(--umbil-muted)', borderColor: 'var(--umbil-divider)' }}
            >
              Your Current Plan
            </button>
          </div>

          {/* 2. STANDARD PLAN (HERO) */}
          <div className="rounded-3xl p-8 shadow-2xl flex flex-col relative overflow-hidden md:scale-105 z-10 h-full" style={{ backgroundColor: '#1fb8cd', border: '2px solid #1fb8cd' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg border shadow-inner" style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }}>
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Standard Pro</h2>
            </div>
            <p className="text-white/90 text-sm mb-6 leading-relaxed">For practicing clinicians, GPs, and power users who need zero limits.</p>
            
            {/* Dynamic Math & Strike-through for Standard */}
            {isAnnual ? (
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white">£150</span>
                  <span className="text-white/80 font-medium">/year</span>
                </div>
                <div className="text-white/90 text-sm font-medium mt-1">
                  <span className="line-through opacity-75 mr-1">£180</span> Save £30/year
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white">£15</span>
                  <span className="text-white/80 font-medium">/month</span>
                </div>
                <div className="text-white text-sm mt-1 opacity-0">Spacer</div>
              </div>
            )}
            
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5 font-bold" />
                <span className="text-white font-medium">Unlimited Capture Learning</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5 font-bold" />
                <span className="text-white font-medium">Unlimited Tool usage</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5 font-bold" />
                <span className="text-white font-medium">Unlimited PSQ generation</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                <span className="text-white font-medium">Deep Dive AI logic mode</span>
              </li>
            </ul>

            <button
              disabled={isCheckingOut}
              onClick={() => handleCheckout()}
              className="w-full py-4 px-4 bg-white hover:bg-gray-50 rounded-xl font-extrabold transition-all disabled:opacity-50 shadow-lg"
              style={{ color: '#1fb8cd' }}
            >
              {isCheckingOut ? 'Loading...' : 'Get Standard Pro'}
            </button>
          </div>

        </div>

        {/* Student Discount Banner */}
        <div className="max-w-3xl mx-auto mt-16 bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 text-center flex flex-col md:flex-row items-center justify-center gap-6 shadow-sm">
            <div className="flex-shrink-0 p-3 bg-teal-50 text-[var(--umbil-brand-teal)] rounded-full">
                <GraduationCap className="w-8 h-8" />
            </div>
            <div className="text-left">
                <h3 className="text-lg font-bold" style={{ color: 'var(--umbil-text)' }}>Are you a Medical Student?</h3>
                <p className="text-sm mt-1" style={{ color: 'var(--umbil-muted)' }}>
                    Umbil Pro is completely free for students. Sign up or change your account email to an official <strong style={{ color: 'var(--umbil-brand-teal)' }}>.ac.uk</strong> address to unlock Pro automatically.
                </p>
            </div>
        </div>

      </div>
    </MainWrapper>
  );
}