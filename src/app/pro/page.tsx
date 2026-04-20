// src/app/pro/page.tsx
"use client";

import { useState } from "react";
import { Check, Sparkles, GraduationCap, Stethoscope } from "lucide-react";
import MainWrapper from "@/components/MainWrapper";
import { useUserEmail } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; // <-- ADDED THIS IMPORT!

export default function ProPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const { email, isPro, loading } = useUserEmail();
  const router = useRouter();

  // Your real Stripe Price IDs!
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
      // We will build this API route in Phase 3
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
       headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}` // Add this line!
        },
        body: JSON.stringify({ priceId, planType: `${plan}_${isAnnual ? 'annual' : 'monthly'}` }),
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Something went wrong initiating checkout.");
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
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
            Supercharge your clinical workflow.
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Basic Q&A will always be free. Upgrade to Pro to remove all daily limits, unlock Deep Dive AI reasoning, and generate unlimited PSQs.
          </p>
        </div>

        {/* Status Alert for existing Pro users */}
        {isPro && (
          <div className="mb-12 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <Sparkles className="w-8 h-8 text-indigo-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">You are already a Pro user!</h3>
            <p className="text-indigo-700 dark:text-indigo-400 mt-1">Enjoy your unlimited access.</p>
          </div>
        )}

        {/* Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl inline-flex">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${!isAnnual ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${isAnnual ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
            >
              Annually <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">Save 16%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Student Plan */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Student</h2>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">For verified medical students (.ac.uk emails).</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">£{isAnnual ? '80' : '8'}</span>
              <span className="text-gray-500 dark:text-gray-400">/{isAnnual ? 'year' : 'month'}</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-grow">
              {['Unlimited Capture Learning entries', 'Deep Dive AI clinical reasoning', 'Unlimited Tool usage', 'Unlimited PSQ generation'].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              disabled={isPro || isCheckingOut}
              onClick={() => handleCheckout('student')}
              className="w-full py-3.5 px-4 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 dark:text-gray-900 text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {isCheckingOut ? 'Loading...' : isPro ? 'Current Plan' : 'Get Student Pro'}
            </button>
          </div>

          {/* Standard Plan */}
          <div className="bg-indigo-600 rounded-3xl p-8 shadow-xl shadow-indigo-200 dark:shadow-none flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-indigo-500/50 text-white text-xs font-bold px-3 py-1 rounded-full border border-indigo-400">Most Popular</span>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-500 p-2 rounded-lg border border-indigo-400">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Standard</h2>
            </div>
            <p className="text-indigo-200 text-sm mb-6">For practicing clinicians and GPs.</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-white">£{isAnnual ? '150' : '15'}</span>
              <span className="text-indigo-200">/{isAnnual ? 'year' : 'month'}</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-grow">
              {['Unlimited Capture Learning entries', 'Deep Dive AI clinical reasoning', 'Unlimited Tool usage', 'Unlimited PSQ generation', 'Priority support'].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                  <span className="text-indigo-50">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              disabled={isPro || isCheckingOut}
              onClick={() => handleCheckout('standard')}
              className="w-full py-3.5 px-4 bg-white hover:bg-gray-50 text-indigo-900 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {isCheckingOut ? 'Loading...' : isPro ? 'Current Plan' : 'Get Standard Pro'}
            </button>
          </div>

        </div>
      </div>
    </MainWrapper>
  );
}