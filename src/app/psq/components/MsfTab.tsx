// src/app/psq/components/MsfTab.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Check, MessageSquare, Trash2, X, Lock, FileText } from 'lucide-react';
import { useUserEmail } from "@/hooks/useUser";
import styles from '../psq.module.css';

export default function MsfTab() {
  const { email } = useUserEmail();
  const [msfCycles, setMsfCycles] = useState<any[]>([]);
  const [msfLoading, setMsfLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Modal State
  const [isMsfModalOpen, setIsMsfModalOpen] = useState(false);
  const [newMsfTitle, setNewMsfTitle] = useState('');
  const [msfThreshold, setMsfThreshold] = useState<number>(15);
  const [creatingMsf, setCreatingMsf] = useState(false);

  useEffect(() => {
    if (email) fetchMsfCycles();
  }, [email]);

  const fetchMsfCycles = async () => {
    setMsfLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('msf_cycles')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setMsfCycles(data);
    setMsfLoading(false);
  };

  const handleMsfCreateOpen = () => {
    setNewMsfTitle(`MSF Appraisal ${new Date().getFullYear()}`);
    setMsfThreshold(15);
    setIsMsfModalOpen(true);
  };

  const createMsfCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingMsf(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase.from('msf_cycles').insert({ 
        user_id: user.id, 
        title: newMsfTitle, 
        required_responses: msfThreshold, 
        status: 'open'
      }).select().single();

      if (error) {
          console.error("Error creating MSF:", error);
          alert("Failed to create MSF cycle.");
      } else if (data) {
          setMsfCycles([data, ...msfCycles]);
          setIsMsfModalOpen(false);
      }
    }
    setCreatingMsf(false);
  };

  const deleteMsfCycle = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.confirm("Are you sure? This will delete the cycle AND all colleague responses.")) return;
    const { error } = await supabase.from('msf_cycles').delete().eq('id', id);
    if (!error) setMsfCycles(msfCycles.filter(c => c.id !== id));
  };

  const handlePayment = async (id: string) => {
    setCheckoutLoading(id);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'msf', id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Payment setup failed. Please try again.");
    } catch (err) {
      console.error(err);
      alert("Something went wrong with the payment request.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
              <h1 className="text-3xl font-bold text-[var(--umbil-text)] mb-2">Multi-Source Feedback (MSF)</h1>
              <p className="text-[var(--umbil-muted)] text-lg">Gather anonymous feedback from clinical and non-clinical colleagues for your appraisal.</p>
          </div>
          <button onClick={handleMsfCreateOpen} className="btn btn--primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-teal-500/20 whitespace-nowrap">
              <Plus size={20} /> Start MSF Cycle
          </button>
      </div>

      {/* Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700 mt-0.5">
              <Check size={18} />
          </div>
          <div>
              <h4 className="font-bold text-emerald-900">Colleague Multi-Source Feedback (MSF)</h4>
              <p className="text-emerald-700 text-sm mt-1">
                  Frictionless feedback collection. Start your cycle and gather all responses <strong>for free</strong>. Only pay £24 when you're ready to close the cycle and unlock your full appraisal report and automated reflection draft.
              </p>
          </div>
      </div>

      {/* Content */}
      {msfLoading ? (
        <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-24 bg-[var(--umbil-surface)] rounded-xl animate-pulse"></div>)}
        </div>
      ) : msfCycles.length === 0 ? (
        <div className="bg-[var(--umbil-surface)] border-2 border-dashed border-[var(--umbil-divider)] rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-[var(--umbil-text)]">No MSF cycles yet</h3>
            <p className="text-[var(--umbil-muted)] mb-6">Start a new cycle to get a unique colleague survey link.</p>
            <button onClick={handleMsfCreateOpen} className="btn btn--outline">Start First Cycle</button>
        </div>
      ) : (
        <div className="grid gap-4">
            {msfCycles.map((cycle) => {
            const responseCount = cycle.response_count || 0;
            const msfTarget = cycle.required_responses || 15; 
            const isReady = responseCount >= msfTarget;
            const isClosed = cycle.status === 'closed';

            return (
                <div key={cycle.id} className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                    <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isReady ? 'bg-emerald-100 text-emerald-600' : 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)]'}`}>
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <Link href={`/msf/${cycle.id}`}>
                                <h3 className="text-lg font-bold text-[var(--umbil-text)] hover:text-[var(--umbil-brand-teal)] transition-colors flex items-center gap-2">
                                    {cycle.title || 'MSF Cycle'}
                                    {isClosed && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">Closed</span>}
                                </h3>
                            </Link>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-[var(--umbil-muted)]">
                                    {new Date(cycle.created_at).toLocaleDateString()}
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-muted)]'}`}>
                                    {responseCount} / {msfTarget} Responses
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        {isReady && isClosed ? (
                            <>
                                {cycle.has_paid ? (
                                    <Link href={`/msf/${cycle.id}?tab=results`} className="flex-1 sm:flex-none px-4 py-2 bg-[var(--umbil-brand-teal)] text-white rounded-lg hover:bg-teal-700 font-bold text-sm text-center transition-colors">
                                        View Final Report & AI
                                    </Link>
                                ) : (
                                    <button 
                                        onClick={() => handlePayment(cycle.id)}
                                        disabled={checkoutLoading === cycle.id}
                                        className="flex-1 sm:flex-none px-4 py-2 flex items-center justify-center gap-2 bg-[var(--umbil-text)] text-[var(--umbil-surface)] rounded-lg hover:opacity-90 font-bold text-sm transition-opacity"
                                    >
                                        {checkoutLoading === cycle.id ? 'Loading...' : <><Lock size={14}/> Unlock Report (£24)</>}
                                    </button>
                                )}
                            </>
                        ) : (
                            <Link href={`/msf/${cycle.id}`} className="text-sm font-bold text-[var(--umbil-brand-teal)] hover:underline">
                                Manage & Share Link
                            </Link>
                        )}

                        <button onClick={(e) => deleteMsfCycle(cycle.id, e)} className="p-2 text-[var(--umbil-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto sm:ml-0">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            );
            })}
        </div>
      )}

      {/* Create Modal */}
      {isMsfModalOpen && (
        <div className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4`}>
            <div className={`bg-[var(--umbil-surface)] w-full max-w-md rounded-2xl shadow-2xl p-6 ${styles.animateIn} ${styles.zoomIn95} duration-200`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-[var(--umbil-text)]">Start New MSF Cycle</h3>
                    <button onClick={() => setIsMsfModalOpen(false)} className="text-[var(--umbil-muted)] hover:text-[var(--umbil-text)]">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={createMsfCycle}>
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-[var(--umbil-text)] mb-2">Cycle Name</label>
                        <input 
                            type="text" 
                            value={newMsfTitle}
                            onChange={(e) => setNewMsfTitle(e.target.value)}
                            placeholder="e.g. MSF Appraisal 2026"
                            className="w-full p-3 border border-[var(--umbil-divider)] bg-[var(--umbil-bg)] text-[var(--umbil-text)] rounded-xl focus:border-[var(--umbil-brand-teal)] outline-none"
                            autoFocus
                        />
                    </div>
                    
                    <div className="mb-8">
                        <label className="block text-sm font-bold text-[var(--umbil-text)] mb-2 flex justify-between">
                            <span>Anonymity Threshold</span>
                            <span className="text-[var(--umbil-brand-teal)]">{msfThreshold} Responses</span>
                        </label>
                        <p className="text-xs text-[var(--umbil-muted)] mb-3">Results will remain locked until this many colleagues have submitted feedback to protect their identity.</p>
                        <input 
                            type="range" 
                            min="5" max="20" 
                            value={msfThreshold}
                            onChange={(e) => setMsfThreshold(parseInt(e.target.value))}
                            className="w-full accent-[var(--umbil-brand-teal)]"
                        />
                        <div className="flex justify-between text-xs text-[var(--umbil-muted)] mt-1">
                            <span>5</span><span>20</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={() => setIsMsfModalOpen(false)} className="flex-1 py-3 text-[var(--umbil-text)] font-bold hover:bg-[var(--umbil-hover-bg)] rounded-xl transition-colors">Cancel</button>
                        <button type="submit" disabled={creatingMsf} className="flex-1 py-3 bg-[var(--umbil-brand-teal)] text-white font-bold rounded-xl hover:bg-teal-700 transition-colors">
                            {creatingMsf ? 'Starting...' : 'Start Cycle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}