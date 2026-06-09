"use client";

import { useState, useEffect } from "react";
import { Check, Sparkles, GraduationCap, Users, X, CreditCard, Activity, Target, MessageSquare, Stethoscope, User } from "lucide-react";
import MainWrapper from "@/components/MainWrapper";
import { useUserEmail } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ProPage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [stats, setStats] = useState({ questions: 0, tools: 0, captures: 0 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  
  const { email, isPro, loading } = useUserEmail();
  const router = useRouter();

  // Updated Live Stripe Price IDs
  const STRIPE_PRICES = {
    pro_monthly: "price_1TgCHkEwbwdYfgj4xSqguUmo",
    pro_annual: "price_1TgCHkEwbwdYfgj4x4ytPO05",
    team_monthly: "price_1TgCIBEwbwdYfgj4ie6nH1m2",
    team_annual: "price_1TgCJBEwbwdYfgj4MWPA4Sk0",
  };

  useEffect(() => {
    if (isPro) {
      const fetchStats = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch("/api/user/stats", {
            headers: {
              "Authorization": `Bearer ${session?.access_token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            setStats(data);
          }
        } catch (error) {
          console.error("Failed to load stats", error);
        } finally {
          setIsStatsLoading(false);
        }
      };
      fetchStats();
    }
  }, [isPro]);

  const handleCheckout = async (tier: 'pro' | 'team') => {
    if (!email) {
      router.push('/auth?redirect=/pro');
      return;
    }
    
    setIsCheckingOut(true);
    let priceId = "";
    
    if (tier === 'pro') {
        priceId = isAnnual ? STRIPE_PRICES.pro_annual : STRIPE_PRICES.pro_monthly;
    } else {
        priceId = isAnnual ? STRIPE_PRICES.team_annual : STRIPE_PRICES.team_monthly;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ priceId, planType: `${tier}_${isAnnual ? 'annual' : 'monthly'}` }),
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
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24 animate-in fade-in duration-500">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-50 text-[var(--umbil-brand-teal)] mb-6 shadow-sm border border-teal-100">
              <Sparkles className="w-10 h-10" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-[var(--umbil-text)]">
              Thank you for being a Pro!
            </h1>
            <p className="text-xl text-[var(--umbil-muted)] max-w-2xl mx-auto">
              Your account is fully upgraded. Here is a look at your clinical impact so far.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] p-8 rounded-2xl flex flex-col items-center text-center shadow-sm relative overflow-hidden">
              <MessageSquare className="w-8 h-8 text-blue-500 mb-3 opacity-80" />
              <h3 className="text-lg font-medium text-[var(--umbil-muted)] mb-1">Questions Asked</h3>
              <p className="text-4xl font-extrabold text-[var(--umbil-text)]">
                {isStatsLoading ? "..." : stats.questions}
              </p>
            </div>
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] p-8 rounded-2xl flex flex-col items-center text-center shadow-sm relative overflow-hidden">
              <Activity className="w-8 h-8 text-[var(--umbil-brand-teal)] mb-3 opacity-80" />
              <h3 className="text-lg font-medium text-[var(--umbil-muted)] mb-1">Tools Generated</h3>
              <p className="text-4xl font-extrabold text-[var(--umbil-text)]">
                {isStatsLoading ? "..." : stats.tools}
              </p>
            </div>
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] p-8 rounded-2xl flex flex-col items-center text-center shadow-sm relative overflow-hidden">
              <Target className="w-8 h-8 text-purple-500 mb-3 opacity-80" />
              <h3 className="text-lg font-medium text-[var(--umbil-muted)] mb-1">Learning Captured</h3>
              <p className="text-4xl font-extrabold text-[var(--umbil-text)]">
                {isStatsLoading ? "..." : stats.captures}
              </p>
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
      <div className="max-w-[1400px] mx-auto px-4 py-16 sm:py-24 animate-in fade-in duration-500">
        
        {/* Header Section */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight text-[var(--umbil-text)]">
            Capture learning as you work.<br/>Stay appraisal ready all year.
          </h1>
          <p className="text-xl text-[var(--umbil-muted)] leading-relaxed mb-6">
            You’re already using Umbil to answer clinical questions, write referrals and support patient care. Umbil Pro helps you capture that learning in real time, turning everyday clinical work into meaningful appraisal evidence without the end-of-year scramble.
          </p>
          <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-4 inline-block">
            <p className="text-sm font-medium text-teal-900">
              <span className="font-extrabold text-[var(--umbil-brand-teal)] mr-1">Did you know?</span> Doctors can spend up to 80 hours each year preparing for appraisal and revalidation. Umbil helps capture learning as it happens, reducing the need for retrospective portfolio building.
            </p>
          </div>
        </div>

        {/* Pricing Tiers Intro */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-3xl font-extrabold mb-4 text-[var(--umbil-text)]">Pricing</h2>
          <p className="text-lg text-[var(--umbil-muted)] mb-6">
            Choose the plan that works for you or your team. Whether you’re a medical student, trainee, GP, nurse, pharmacist, ANP or consultant, Umbil helps you answer clinical questions, reduce admin, capture learning and prepare for appraisal, all within a single platform.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-12">
          <div className="p-1 rounded-xl inline-flex shadow-inner border bg-[var(--umbil-bg)] border-[var(--umbil-divider)]">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${!isAnnual ? 'shadow-sm bg-[var(--umbil-surface)] text-[var(--umbil-text)]' : 'text-[var(--umbil-muted)] hover:text-[var(--umbil-text)]'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'shadow-sm bg-[var(--umbil-surface)] text-[var(--umbil-text)]' : 'text-[var(--umbil-muted)] hover:text-[var(--umbil-text)]'}`}
            >
              Annually 
              <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold tracking-wide bg-[var(--umbil-brand-teal)]/15 text-[var(--umbil-brand-teal)]">
                SAVE UP TO 31%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards - 3 Column Layout */}
        <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 max-w-6xl mx-auto items-stretch mb-8">
          
          {/* TIER 0: FREE */}
          <div className="border border-[var(--umbil-divider)] bg-[var(--umbil-surface)] rounded-3xl p-8 shadow-sm flex flex-col h-full opacity-90 hover:opacity-100 transition-opacity">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-[var(--umbil-text)] mb-2">Free</h2>
                <span className="text-[var(--umbil-muted)] text-sm font-medium">Explore Umbil for free</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--umbil-hover-bg)]">
                <User className="w-8 h-8 text-[var(--umbil-muted)]" />
              </div>
            </div>
            
            <p className="text-[var(--umbil-muted)] text-sm mb-6 leading-relaxed">
              Perfect for trying out Umbil's core medical knowledge base before committing to a full clinical workflow tool.
            </p>
            
            <div className="mb-8 flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-[var(--umbil-text)]">£0</span>
              </div>
              <div className="text-[var(--umbil-muted)] text-sm font-medium mt-1">
                Forever free
              </div>
              {/* Invisible spacer to keep cards aligned */}
              <div className="text-transparent text-sm font-bold mt-2 px-2 py-1 select-none">Spacer</div>
            </div>
            
            <button
              disabled
              className="w-full py-4 px-4 bg-[var(--umbil-hover-bg)] text-[var(--umbil-muted)] border border-[var(--umbil-divider)] rounded-xl font-extrabold shadow-sm mb-8 cursor-not-allowed"
            >
              Your Current Plan
            </button>

            <div className="flex-grow">
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--umbil-muted)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--umbil-text)] text-sm font-medium">Standard Clinical Q&A</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--umbil-muted)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--umbil-text)] text-sm font-medium"><strong>10</strong> Capture Learning logs / month</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--umbil-muted)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--umbil-text)] text-sm font-medium"><strong>5</strong> Tool generations / month</span>
                </li>
                <li className="flex items-start gap-3 opacity-50">
                  <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="line-through text-[var(--umbil-muted)] text-sm font-medium">Appraisal-Ready Patient Feedback</span>
                </li>
                <li className="flex items-start gap-3 opacity-50">
                  <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="line-through text-[var(--umbil-muted)] text-sm font-medium">Appraisal-Ready Colleague Feedback</span>
                </li>
                <li className="flex items-start gap-3 opacity-50">
                  <X className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="line-through text-[var(--umbil-muted)] text-sm font-medium">Automated PDP Goal Generation</span>
                </li>
              </ul>
            </div>
          </div>

          {/* TIER 1: UMBIL PRO (HERO) */}
          <div className="rounded-3xl p-8 shadow-xl flex flex-col relative overflow-hidden z-10 h-full border-2 border-[var(--umbil-brand-teal)] bg-[var(--umbil-surface)] lg:scale-105">
            <div className="absolute top-0 left-0 w-full h-2 bg-[var(--umbil-brand-teal)]"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-[var(--umbil-text)] mb-2">Umbil Pro</h2>
                <span className="text-[var(--umbil-muted)] text-sm font-medium">For individual clinicians</span>
              </div>
              <div className="p-3 rounded-xl bg-teal-50">
                <Stethoscope className="w-8 h-8 text-[var(--umbil-brand-teal)]" />
              </div>
            </div>
            
            <p className="text-[var(--umbil-muted)] text-sm mb-6 leading-relaxed">
              Everything you need to support clinical practice, learning, appraisal and professional development with zero limits.
            </p>
            
            <div className="mb-8">
              {isAnnual ? (
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-[var(--umbil-text)]">£200</span>
                    <span className="text-[var(--umbil-muted)] font-medium">/year</span>
                  </div>
                  <div className="text-[var(--umbil-text)] font-medium text-sm mt-1">
                    Just £16.67/month billed annually
                  </div>
                  <div className="text-emerald-600 text-sm font-bold mt-2 bg-emerald-50 inline-block px-2 py-1 rounded w-fit">
                    Save £88 every year (31%)
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-[var(--umbil-text)]">£24</span>
                    <span className="text-[var(--umbil-muted)] font-medium">/month</span>
                  </div>
                  {/* Invisible spacers to keep cards aligned */}
                  <div className="text-transparent font-medium text-sm mt-1 select-none">Spacer</div>
                  <div className="text-transparent text-sm font-bold mt-2 px-2 py-1 select-none">Spacer</div>
                </div>
              )}
            </div>
            
            <button
              disabled={isCheckingOut}
              onClick={() => handleCheckout('pro')}
              className="w-full py-4 px-4 bg-[var(--umbil-brand-teal)] hover:bg-teal-600 text-white rounded-xl font-extrabold transition-all disabled:opacity-50 shadow-md mb-8"
            >
              {isCheckingOut ? 'Loading...' : 'Subscribe to Pro'}
            </button>

            <div className="flex-grow">
              <p className="text-xs font-bold text-[var(--umbil-brand-teal)] uppercase tracking-wider mb-4">Unlocks everything:</p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--umbil-text)] text-sm font-bold">Unlimited Capture Learning logs & reflection prompts</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--umbil-text)] text-sm font-bold">Unlimited clinical tool usage (Referrals, Info, Translation)</span>
                </li>
                <li className="flex items-start gap-3 bg-teal-50/50 p-2 rounded-lg -ml-2">
                  <Activity className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--umbil-text)] text-sm font-bold text-teal-900">Appraisal-Ready Patient Feedback (PSQ) Reports</span>
                </li>
                <li className="flex items-start gap-3 bg-teal-50/50 p-2 rounded-lg -ml-2">
                  <Activity className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--umbil-text)] text-sm font-bold text-teal-900">Appraisal-Ready Colleague Feedback (MSF) Reports</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--umbil-text)] text-sm font-medium">Automated Personal Development Plan (PDP) Generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0 mt-0.5" />
                  <span className="text-[var(--umbil-text)] text-sm font-medium">Trusted UK guideline-aligned clinical support</span>
                </li>
              </ul>
            </div>
          </div>

          {/* TIER 2: UMBIL TEAM */}
          <div className="border border-[var(--umbil-card-border)] bg-[var(--umbil-surface)] rounded-3xl p-8 shadow-md flex flex-col h-full relative">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-extrabold text-[var(--umbil-text)] mb-2">Umbil Team</h2>
                <span className="text-[var(--umbil-muted)] text-sm font-medium">Up to 10 clinicians</span>
              </div>
              <div className="p-3 rounded-xl bg-blue-50">
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <p className="text-[var(--umbil-muted)] text-sm mb-6 leading-relaxed">
              Provide Umbil Pro access to up to 10 clinicians under one subscription. Ideal for GP practices, training practices, and multidisciplinary teams.
            </p>
            
            <div className="mb-8">
              {isAnnual ? (
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-[var(--umbil-text)]">£1,899</span>
                    <span className="text-[var(--umbil-muted)] font-medium">/year</span>
                  </div>
                  <div className="text-[var(--umbil-text)] font-medium text-sm mt-1">
                    As little as £15.83 per clinician/month
                  </div>
                  <div className="text-emerald-600 text-sm font-bold mt-2 bg-emerald-50 inline-block px-2 py-1 rounded w-fit">
                    Save £489 everyyear (20%)
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-extrabold text-[var(--umbil-text)]">£199</span>
                    <span className="text-[var(--umbil-muted)] font-medium">/month</span>
                  </div>
                  {/* Invisible spacers to keep cards aligned */}
                  <div className="text-transparent font-medium text-sm mt-1 select-none">Spacer</div>
                  <div className="text-transparent text-sm font-bold mt-2 px-2 py-1 select-none">Spacer</div>
                </div>
              )}
            </div>
            
            <button
              disabled={isCheckingOut}
              onClick={() => handleCheckout('team')}
              className="w-full py-4 px-4 bg-[var(--umbil-text)] hover:bg-gray-800 text-white rounded-xl font-extrabold transition-all disabled:opacity-50 shadow-md mb-8"
            >
              {isCheckingOut ? 'Loading...' : 'Setup Team Plan'}
            </button>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6">
                <h4 className="font-bold text-gray-900 text-sm mb-2 flex items-center gap-2">
                    <Check size={16} className="text-green-600"/> Simple Concierge Setup
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                    After subscribing, simply provide us the names and email addresses of the clinicians you would like to include. We’ll manually activate Umbil Pro access for each user ensuring your team is onboarded smoothly.
                </p>
            </div>

            <div className="flex-grow">
              <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-[var(--umbil-brand-teal)] flex-shrink-0 mt-0.5" />
                    <span className="text-[var(--umbil-text)] text-sm font-bold">Includes everything in Umbil Pro for up to 10 clinicians.</span>
                  </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Student Banner Moved Below Pricing */}
        <div className="max-w-3xl mx-auto mb-10">
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-center gap-4 text-teal-900 shadow-sm text-center md:text-left">
                <GraduationCap className="w-8 h-8 text-teal-600 flex-shrink-0" />
                <p className="text-sm font-medium">
                  <strong>Medical, nursing and healthcare students</strong> get Umbil free with a verified <span className="font-extrabold text-teal-700">.ac.uk</span> email. <Link href="/auth" className="underline font-bold hover:text-teal-700">Sign up here &rarr;</Link>
                </p>
            </div>
        </div>

      </div>
    </MainWrapper>
  );
}