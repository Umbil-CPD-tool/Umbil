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
        
        {/* Header - Fixed light mode text visibility using text-slate-900 */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">
            Supercharge your clinical workflow.
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Basic Q&A will always be free. Upgrade to Pro to remove all daily limits, unlock Deep Dive AI reasoning, and generate unlimited PSQs.
          </p>
        </div>

        {/* Status Alert for existing Pro users */}
        {isPro && (
          <div className="mb-12 bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <Sparkles className="w-8 h-8 text-teal-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-teal-900 dark:text-teal-300">You are already a Pro user!</h3>
            <p className="text-teal-700 dark:text-teal-400 mt-1">Enjoy your unlimited access.</p>
          </div>
        )}

        {/* Toggle */}
        <div className="flex justify-center mb-16">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl inline-flex shadow-inner border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${!isAnnual ? 'bg-white dark:bg-slate-700 shadow-md text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'bg-white dark:bg-slate-700 shadow-md text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}
            >
              Annually <span className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 px-2.5 py-0.5 rounded-full font-extrabold tracking-wide">SAVE 16%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards - 3 Column Layout */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          
          {/* 1. FREE PLAN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                <User className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Free</h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">Perfect for trying out Umbil&apos;s core medical knowledge base.</p>
            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">£0</span>
              </div>
              <div className="text-slate-500 text-sm mt-1 font-medium">Forever free</div>
            </div>
            
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300">Standard Clinical Q&A</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300"><strong>3</strong> Capture Learning logs / day</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300"><strong>3</strong> Tool generations / day</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300"><strong>1</strong> PSQ generation / year</span>
              </li>
              <li className="flex items-start gap-3 opacity-50">
                <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-500 dark:text-slate-400 line-through">Deep Dive AI reasoning</span>
              </li>
            </ul>

            <button
              disabled
              className="w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold transition-all border border-slate-200 dark:border-slate-700"
            >
              {isPro ? 'Included' : 'Your Current Plan'}
            </button>
          </div>

          {/* 2. STANDARD PLAN (HERO) */}
          <div className="bg-teal-600 rounded-3xl p-8 shadow-2xl shadow-teal-900/20 dark:shadow-none flex flex-col relative overflow-hidden md:scale-105 z-10 border-2 border-teal-500 h-full">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-teal-500 text-white text-xs font-extrabold tracking-wide px-3 py-1 rounded-full border border-teal-400 shadow-sm">MOST POPULAR</span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-teal-500 p-2 rounded-lg border border-teal-400 shadow-inner">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Standard Pro</h2>
            </div>
            <p className="text-teal-100 text-sm mb-6 leading-relaxed">For practicing clinicians, GPs, and power users who need zero limits.</p>
            
            {/* Dynamic Math & Strike-through for Standard */}
            {isAnnual ? (
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white">£150</span>
                  <span className="text-teal-100 font-medium">/year</span>
                </div>
                <div className="text-teal-200 text-sm font-medium mt-1">
                  <span className="line-through opacity-75 mr-1">£180</span> Save £30/year
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-white">£15</span>
                  <span className="text-teal-100 font-medium">/month</span>
                </div>
                <div className="text-teal-600 text-sm mt-1 opacity-0">Spacer</div>
              </div>
            )}
            
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-teal-300 flex-shrink-0 mt-0.5 font-bold" />
                <span className="text-white font-medium">Unlimited Capture Learning</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-teal-300 flex-shrink-0 mt-0.5 font-bold" />
                <span className="text-white font-medium">Unlimited Tool usage</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-teal-300 flex-shrink-0 mt-0.5 font-bold" />
                <span className="text-white font-medium">Unlimited PSQ generation</span>
              </li>
              <li className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                <span className="text-white font-medium">Deep Dive AI logic mode</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-teal-300 flex-shrink-0 mt-0.5 font-bold" />
                <span className="text-teal-50">Priority email support</span>
              </li>
            </ul>

            <button
              disabled={isPro || isCheckingOut}
              onClick={() => handleCheckout('standard')}
              className="w-full py-4 px-4 bg-white hover:bg-slate-50 text-teal-700 rounded-xl font-extrabold transition-all disabled:opacity-50 shadow-lg"
            >
              {isCheckingOut ? 'Loading...' : isPro ? 'Current Plan' : 'Get Standard Pro'}
            </button>
          </div>

          {/* 3. STUDENT PLAN */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg border border-blue-100 dark:border-blue-800">
                <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Student Pro</h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed">Full Pro access. <span className="font-semibold text-slate-700 dark:text-slate-300">Requires a valid .ac.uk email address.</span></p>
            
            {/* Dynamic Math & Strike-through for Student */}
            {isAnnual ? (
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">£80</span>
                  <span className="text-slate-500 font-medium">/year</span>
                </div>
                <div className="text-emerald-600 dark:text-emerald-400 text-sm font-bold mt-1">
                  <span className="line-through text-slate-400 dark:text-slate-500 mr-1 font-medium">£96</span> Save £16/year
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">£8</span>
                  <span className="text-slate-500 font-medium">/month</span>
                </div>
                <div className="text-slate-500 text-sm mt-1 opacity-0">Spacer</div>
              </div>
            )}
            
            <ul className="space-y-4 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300">Unlimited Capture Learning</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300">Unlimited Tool usage</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300">Unlimited PSQ generation</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <span className="text-slate-600 dark:text-slate-300">Deep Dive AI logic mode</span>
              </li>
            </ul>

            <button
              disabled={isPro || isCheckingOut}
              onClick={() => handleCheckout('student')}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {isCheckingOut ? 'Loading...' : isPro ? 'Current Plan' : 'Get Student Pro'}
            </button>
          </div>

        </div>
      </div>
    </MainWrapper>
  );
}