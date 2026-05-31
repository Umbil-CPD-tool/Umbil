'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { calculateMsfAnalytics, MsfAnalyticsResult } from '@/lib/msf-analytics';
import MsfShareGatherTab from '../components/MsfShareGatherTab';
import MsfResultsReflectionTab from '../components/MsfResultsReflectionTab';

export default function MSFDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [activeTab, setActiveTab] = useState<'share_and_gather' | 'results_and_reflection'>('share_and_gather');
  const [cycle, setCycle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<MsfAnalyticsResult | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'results_and_reflection' || tabParam === 'share_and_gather') {
        setActiveTab(tabParam as any);
    }
    fetchCycle();
  }, [resolvedParams.id]);

  const fetchCycle = async () => {
    const { data, error } = await supabase
      .from('msf_cycles')
      .select('*, msf_responses(*)')
      .eq('id', resolvedParams.id)
      .single();

    if (!error && data) {
      const responses = data.msf_responses || [];
      data.response_count = responses.length;
      
      const analyticsData = calculateMsfAnalytics(data, responses);
      setAnalytics(analyticsData);
      setCycle(data);
    }
    setLoading(false);
  };

  const handleCloseCycle = async () => {
    if (!window.confirm("Are you sure? Colleagues will no longer be able to submit feedback once closed.")) return;
    
    const { error } = await supabase.from('msf_cycles').update({ status: 'closed' }).eq('id', cycle.id);
    if (!error) {
      fetchCycle();
      setActiveTab('results_and_reflection');
    }
  };

  if (loading) return <div className="min-h-screen bg-[var(--umbil-bg)] p-8 flex justify-center"><div className="animate-pulse h-8 w-32 bg-gray-200 rounded"></div></div>;
  if (!cycle || !analytics) return <div className="min-h-screen bg-[var(--umbil-bg)] p-8 text-center text-[var(--umbil-muted)]">Cycle not found</div>;

  const isThresholdMet = analytics.stats.thresholdMet;
  const isClosed = cycle.status === 'closed' || isThresholdMet;

  return (
    <section className="bg-[var(--umbil-bg)] min-h-screen pb-20">
      <div className="bg-[var(--umbil-surface)] border-b border-[var(--umbil-divider)] pt-8 pb-0 px-5 mb-8">
        <div className="container mx-auto max-w-[1000px]">
          <Link href="/psq?tab=msf" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Hub
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-[var(--umbil-text)]">{cycle.title || 'MSF Cycle'}</h1>
                {isClosed ? (
                    <span className="px-3 py-1 bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] border border-[var(--umbil-brand-teal)]/20 text-xs font-bold rounded-full">Closed</span>
                ) : (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${isThresholdMet ? 'bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] border border-[var(--umbil-brand-teal)]/20' : 'bg-amber-100 text-amber-700'}`}>
                        Gathering Feedback
                    </span>
                )}
              </div>
              <span className="text-sm text-[var(--umbil-muted)] ml-2">• Created {new Date(cycle.created_at).toLocaleDateString()}</span>
            </div>
            
            {!isClosed && isThresholdMet && (
              <button onClick={handleCloseCycle} className="btn btn--primary bg-emerald-600 hover:bg-emerald-700 shadow-sm">
                Close Cycle & Finalize
              </button>
            )}
          </div>

          <div className="flex gap-6 border-b border-[var(--umbil-divider)] overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('share_and_gather')}
              className={`py-3 px-1 font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'share_and_gather' ? 'border-[var(--umbil-brand-teal)] text-[var(--umbil-brand-teal)]' : 'border-transparent text-[var(--umbil-muted)] hover:text-[var(--umbil-text)]'}`}
            >
              Share & Gather
            </button>
            <button 
              onClick={() => setActiveTab('results_and_reflection')}
              className={`py-3 px-1 font-bold whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'results_and_reflection' ? 'border-[var(--umbil-brand-teal)] text-[var(--umbil-brand-teal)]' : 'border-transparent text-[var(--umbil-muted)] hover:text-[var(--umbil-text)]'} ${!isThresholdMet ? 'opacity-70' : ''}`}
            >
              Results & Reflection {!isThresholdMet && <Lock size={12} className="ml-1"/>}
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-[1000px] px-5">
        {activeTab === 'share_and_gather' && (
           <MsfShareGatherTab cycle={cycle} analytics={analytics} onRefresh={fetchCycle} />
        )}

        {activeTab === 'results_and_reflection' && (
           <MsfResultsReflectionTab cycle={cycle} analytics={analytics} />
        )}
      </div>
    </section>
  );
}