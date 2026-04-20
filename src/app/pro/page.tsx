// src/app/pro/page.tsx
"use client";

import { useState } from "react";
import { Check, Sparkles, GraduationCap, Stethoscope, User, X } from "lucide-react";
import MainWrapper from "@/components/MainWrapper";
import { useUserEmail } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { email, isPro, loading } = useUserEmail();
  const router = useRouter();

  // Your live Stripe Price IDs
  const STRIPE_PRICES = {
    standard_monthly: "price_1TNyVYEwbwdYfgj4KDbSkn3I",
    standard_annual: "price_1TNyVXEwbwdYfgj4XSPztsUp",
    student_monthly: "price_1TNyVYEwbwdYfgj4xjNBRtkj",
    student_annual: "price_1TNyVXEwbwdYfgj4Q4yLWbbD",
  };

  const handleCheckout = async (plan: 'standard' | 'student') => {
    if (!email) {
      router.push('/auth?redirect=/pro');
      return;
    }
    
    setIsCheckingOut(true);
    const priceId = plan === 'standard' 
      ? (isAnnual ? STRIPE_PRICES.standard_annual : STRIPE_PRICES.standard_monthly)
      : (isAnnual ? STRIPE_PRICES.student_annual : STRIPE_PRICES.student_monthly);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ priceId, planType: `${plan}_${isAnnual ? 'annual' : 'monthly'}` }),
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

  if (loading) return null;

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

        {/* Status Alert for existing Pro users */}
        {isPro && (
          <div className="mb-12 border rounded-2xl p-6 text-center max-w-2xl mx-auto" style={{ backgroundColor: 'rgba(31, 184, 205, 0.1)', borderColor: 'rgba(31, 184, 205, 0.3)' }}>
            <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: '#1fb8cd' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--umbil-text)' }}>You are already a Pro user!</h3>
            <p className="mt-1" style={{ color: 'var(--umbil-muted)' }}>Enjoy your unlimited access.</p>
          </div>
        )}

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

        {/* Pricing Cards - 3 Column Layout */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          
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
              {isPro ? 'Included' : 'Your Current Plan'}
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
              disabled={isPro || isCheckingOut}
              onClick={() => handleCheckout('standard')}
              className="w-full py-4 px-4 bg-white hover:bg-gray-50 rounded-xl font-extrabold transition-all disabled:opacity-50 shadow-lg"
              style={{ color: '#1fb8cd' }}
            >
              {isCheckingOut ? 'Loading...' : isPro ? 'Current Plan' : 'Get Standard Pro'}
            </button>
          </div>

          {/* 3. STUDENT PLAN */}
          <div className="border rounded-3xl p-8 shadow-sm flex flex-col h-full" style={{ backgroundColor: 'var(--umbil-surface)', borderColor: 'var(--umbil-divider)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg border" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
                <GraduationCap className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold" style={{ color: 'var(--umbil-text)' }}>Student Pro</h2>
            </div>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--umbil-muted)' }}>
              Full Pro access. <span className="font-semibold" style={{ color: 'var(--umbil-text)' }}>Requires a valid .ac.uk email address.</span>
            </p>
            
            {/* Dynamic Math & Strike-through for Student */}
            {isAnnual ? (
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold" style={{ color: 'var(--umbil-text)' }}>£80</span>
                  <span className="font-medium" style={{ color: 'var(--umbil-muted)' }}>/year</span>
                </div>
                <div className="text-sm font-bold mt-1" style={{ color: '#1fb8cd' }}>
                  <span className="line-through mr-1 font-medium" style={{ color: 'var(--umbil-muted)' }}>£96</span> Save £16/year
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold" style={{ color: 'var(--umbil-text)' }}>£8</span>
                  <span className="font-medium" style={{ color: 'var(--umbil-muted)' }}>/month</span>
                </div>
                <div className="text-sm mt-1 opacity-0">Spacer</div>
              </div>
            )}
            
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#1fb8cd' }} />
                <span style={{ color: 'var(--umbil-text)' }}>Unlimited Capture Learning</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#1fb8cd' }} />
                <span style={{ color: 'var(--umbil-text)' }}>Unlimited Tool usage</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#1fb8cd' }} />
                <span style={{ color: 'var(--umbil-text)' }}>Unlimited PSQ generation</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#1fb8cd' }} />
                <span style={{ color: 'var(--umbil-text)' }}>Deep Dive AI logic mode</span>
              </li>
            </ul>

            <button
              disabled={isPro || isCheckingOut}
              onClick={() => handleCheckout('student')}
              className="w-full py-3.5 px-4 rounded-xl font-bold transition-all disabled:opacity-50 hover:opacity-90 border"
              style={{ backgroundColor: 'var(--umbil-text)', color: 'var(--umbil-surface)', borderColor: 'var(--umbil-text)' }}
            >
              {isCheckingOut ? 'Loading...' : isPro ? 'Current Plan' : 'Get Student Pro'}
            </button>
          </div>

        </div>
      </div>
    </MainWrapper>
  );
}