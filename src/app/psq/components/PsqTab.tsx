// src/app/psq/components/PsqTab.tsx
'use client';

import { useEffect, useState, useImperativeHandle } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Check, FileText, Trash2, X, Lock, Users } from 'lucide-react';
import { useUserEmail } from "@/hooks/useUser";
import styles from '../psq.module.css';

export default function PsqTab({ onRef }: { onRef?: (ref: any) => void }) {
  const { email } = useUserEmail();
  const [surveys, setSurveys] = useState<any[]>([]);
  const [psqLoading, setPsqLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [psqThreshold, setPsqThreshold] = useState<number>(34);
  const [creating, setCreating] = useState(false);

  // Expose openModal to parent
  useImperativeHandle(onRef, () => ({
    openModal: () => handleCreateOpen()
  }));

  useEffect(() => {
    if (email) fetchSurveys();
  }, [email]);

  const fetchSurveys = async () => {
    setPsqLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('psq_surveys')
      .select('*, psq_responses(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setSurveys(data);
    setPsqLoading(false);
  };

  const handleCreateOpen = () => {
    setNewSurveyTitle(`PSQ Cycle ${new Date().getFullYear()}`);
    setPsqThreshold(34);
    setIsModalOpen(true);
  };

  const createSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        const { data, error } = await supabase
        .from('psq_surveys')
        .insert({ user_id: user.id, title: newSurveyTitle, required_responses: psqThreshold })
        .select()
        .single();

        if (error) {
            console.error("Error creating PSQ:", error);
            alert("Failed to create PSQ cycle.");
        } else if (data) {
            setSurveys([data, ...surveys]);
            setIsModalOpen(false);
        }
    }
    setCreating(false);
  };

  const deleteSurvey = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.confirm("Are you sure? This will delete the survey AND all patient responses.")) return;
    const { error } = await supabase.from('psq_surveys').delete().eq('id', id);
    if (!error) setSurveys(surveys.filter(s => s.id !== id));
  };

  const handlePayment = async (id: string) => {
    setCheckoutLoading(id);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'psq', id }),
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
      
      {/* Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8 flex items-start gap-3">
          <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700 mt-0.5">
              <Check size={18} />
          </div>
          <div>
              <h4 className="font-bold text-emerald-900">Patient Satisfaction Questionnaires (PSQ)</h4>
              <p className="text-emerald-700 text-sm mt-1">
                  Save up to 50% compared to FourteenFish. Create your cycle and collect your required responses completely <strong>for free</strong>. Only pay £19 when you're ready to unlock your final GMC-compliant PDF report and AI summary.
              </p>
          </div>
      </div>

      {/* Content */}
      {psqLoading ? (
        <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-24 bg-[var(--umbil-surface)] rounded-xl animate-pulse"></div>)}
        </div>
      ) : surveys.length === 0 ? (
        <div className="bg-[var(--umbil-surface)] border-2 border-dashed border-[var(--umbil-divider)] rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-[var(--umbil-text)]">No PSQ cycles yet</h3>
            <p className="text-[var(--umbil-muted)] mb-6">Start a new collection cycle to get a unique patient survey link.</p>
            <button onClick={handleCreateOpen} className="btn btn--outline">Start First Cycle</button>
        </div>
      ) : (
        <div className="grid gap-4">
            {surveys.map((survey) => {
            const responseCount = survey.psq_responses?.[0]?.count || 0;
            const psqTarget = survey.required_responses || 34; 
            const isReady = responseCount >= psqTarget;

            return (
                <div key={survey.id} className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group">
                    <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isReady ? 'bg-emerald-100 text-emerald-600' : 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)]'}`}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <Link href={`/psq/${survey.id}`}>
                                <h3 className="text-lg font-bold text-[var(--umbil-text)] hover:text-[var(--umbil-brand-teal)] transition-colors">
                                    {survey.title}
                                </h3>
                            </Link>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-[var(--umbil-muted)]">
                                    {new Date(survey.created_at).toLocaleDateString()}
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-muted)]'}`}>
                                    {responseCount} / {psqTarget} Responses
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        {isReady && (
                            <>
                                {survey.has_paid ? (
                                    <Link href={`/psq/analytics?id=${survey.id}`} className="flex-1 sm:flex-none px-4 py-2 bg-[var(--umbil-brand-teal)] text-white rounded-lg hover:bg-teal-700 font-bold text-sm text-center transition-colors">
                                        View Final Report
                                    </Link>
                                ) : (
                                    <button 
                                        onClick={() => handlePayment(survey.id)}
                                        disabled={checkoutLoading === survey.id}
                                        className="flex-1 sm:flex-none px-4 py-2 flex items-center justify-center gap-2 bg-[var(--umbil-text)] text-[var(--umbil-surface)] rounded-lg hover:opacity-90 font-bold text-sm transition-opacity"
                                    >
                                        {checkoutLoading === survey.id ? 'Loading...' : <><Lock size={14}/> Unlock Report (£19)</>}
                                    </button>
                                )}
                            </>
                        )}
                        
                        {!isReady && (
                            <Link href={`/psq/${survey.id}`} className="text-sm font-bold text-[var(--umbil-brand-teal)] hover:underline">
                                Manage & Share Link
                            </Link>
                        )}

                        <button onClick={(e) => deleteSurvey(survey.id, e)} className="p-2 text-[var(--umbil-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto sm:ml-0">
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            );
            })}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4`}>
            <div className={`bg-[var(--umbil-surface)] w-full max-w-md rounded-2xl shadow-2xl p-6 ${styles.animateIn} ${styles.zoomIn95} duration-200`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-[var(--umbil-text)]">Start New PSQ Cycle</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-[var(--umbil-muted)] hover:text-[var(--umbil-text)]">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={createSurvey}>
                    <div className="mb-4">
                        <label className="block text-sm font-bold text-[var(--umbil-text)] mb-2">Cycle Name</label>
                        <input 
                            type="text" 
                            value={newSurveyTitle}
                            onChange={(e) => setNewSurveyTitle(e.target.value)}
                            placeholder="e.g. PSQ 2026"
                            className="w-full p-3 border border-[var(--umbil-divider)] bg-[var(--umbil-bg)] text-[var(--umbil-text)] rounded-xl focus:border-[var(--umbil-brand-teal)] outline-none"
                            autoFocus
                        />
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-bold text-[var(--umbil-text)] mb-2 flex justify-between">
                            <span>Target Responses</span>
                            <span className="text-[var(--umbil-brand-teal)]">{psqThreshold} Responses</span>
                        </label>
                        <p className="text-xs text-[var(--umbil-muted)] mb-3">GMC usually recommends 34, but you can adjust this based on appraiser agreement.</p>
                        <input 
                            type="range" 
                            min="10" max="50" 
                            value={psqThreshold}
                            onChange={(e) => setPsqThreshold(parseInt(e.target.value))}
                            className="w-full accent-[var(--umbil-brand-teal)]"
                        />
                        <div className="flex justify-between text-xs text-[var(--umbil-muted)] mt-1">
                            <span>10</span><span>50</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[var(--umbil-text)] font-bold hover:bg-[var(--umbil-hover-bg)] rounded-xl transition-colors">Cancel</button>
                        <button type="submit" disabled={creating} className="flex-1 py-3 bg-[var(--umbil-brand-teal)] text-white font-bold rounded-xl hover:bg-teal-700 transition-colors">
                            {creating ? 'Creating...' : 'Create Cycle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}