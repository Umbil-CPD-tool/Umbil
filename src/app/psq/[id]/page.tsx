'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Share2, BarChart3, Lock } from 'lucide-react';
import { calculateAnalytics, AnalyticsResult } from '@/lib/psq-analytics';
import ShareGatherTab from '../components/ShareGatherTab';
import ResultsReflectionTab from '../components/ResultsReflectionTab';

function PSQCycleContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'share_and_gather' | 'results_and_reflection'>(
      tabParam === 'results_and_reflection' ? 'results_and_reflection' : 'share_and_gather'
  );

  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);

  useEffect(() => {
    fetchCycleData();
  }, [id]);

  const fetchCycleData = async () => {
    if (!id) return;
    
    const { data, error } = await supabase
      .from('psq_surveys')
      .select('*, psq_responses(id, answers, created_at)')
      .eq('id', id)
      .single();

    if (error || !data) {
        console.error('Error fetching survey', error);
        router.push('/psq');
        return;
    }

    setSurvey(data);
    const result = calculateAnalytics([data]);
    setAnalytics(result);
    setLoading(false);
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-teal-500 rounded-full border-t-transparent"></div></div>;

  const responses = analytics?.stats.totalResponses || 0;
  const required = survey?.required_responses || analytics?.stats?.targetThreshold || 34;
  const isThresholdMet = responses >= required;

  return (
    <section className="bg-[var(--umbil-bg)] min-h-screen pb-20">
      <div className="container mx-auto max-w-[1000px] px-5 py-8">
        
        {/* Top Nav */}
        <div className="mb-6">
          <Link href="/psq?tab=psq" className="inline-flex items-center gap-2 text-[var(--umbil-muted)] hover:text-[var(--umbil-brand-teal)] text-sm font-medium mb-4">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div className="flex justify-between items-start">
            <div>
               <h1 className="text-2xl font-bold text-[var(--umbil-text)] flex items-center gap-3">
                   {survey.title}
                   {isThresholdMet && (
                       <span className="px-3 py-1 bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] border border-[var(--umbil-brand-teal)]/20 text-xs font-bold rounded-full align-middle">Closed</span>
                   )}
               </h1>
               <div className="flex items-center gap-2 mt-2">
                 {!isThresholdMet && (
                     <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] border border-[var(--umbil-brand-teal)]/20">
                         Collecting Responses
                     </span>
                 )}
                 <span className="text-sm text-[var(--umbil-muted)]">• Created {new Date(survey.created_at).toLocaleDateString()}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Tabs Header */}
        <div className="flex border-b border-[var(--umbil-divider)] mb-8 overflow-x-auto">
           <TabButton id="share_and_gather" label="Share & Gather" icon={<Share2 size={16}/>} active={activeTab} set={setActiveTab} />
           <TabButton id="results_and_reflection" label="Results & Reflection" icon={<BarChart3 size={16}/>} active={activeTab} set={setActiveTab} locked={!isThresholdMet} />
        </div>

        {/* Tab Content Rendering */}
        {activeTab === 'share_and_gather' && (
           <ShareGatherTab 
              id={id} 
              survey={survey} 
              responses={responses} 
              required={required} 
              isThresholdMet={isThresholdMet} 
           />
        )}

        {activeTab === 'results_and_reflection' && analytics && (
           <ResultsReflectionTab 
              survey={survey} 
              analytics={analytics} 
              responses={responses} 
              required={required} 
              isThresholdMet={isThresholdMet} 
           />
        )}

      </div>
    </section>
  );
}

function TabButton({ id, label, icon, active, set, locked = false }: any) {
    return (
        <button 
            onClick={() => set(id)}
            className={`
                flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap
                ${active === id 
                    ? 'border-[var(--umbil-brand-teal)] text-[var(--umbil-brand-teal)] font-bold' 
                    : 'border-transparent text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] font-medium'}
                ${locked ? 'opacity-70' : 'cursor-pointer'}
            `}
        >
            {icon} {label} {locked && <Lock size={12} className="ml-1"/>}
        </button>
    )
}

export default function PSQCyclePage() {
  return (
    <Suspense fallback={<div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-teal-500 rounded-full border-t-transparent"></div></div>}>
      <PSQCycleContent />
    </Suspense>
  );
}