// src/app/psq/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Copy, Check, FileText, ChevronRight, Trash2, X } from 'lucide-react';
import { useUserEmail } from "@/hooks/useUser";
import styles from './psq.module.css';

export default function PSQDashboard() {
  const [surveys, setSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const { email, loading: userLoading } = useUserEmail();

  useEffect(() => {
    if (email) fetchSurveys();
  }, [email]);

  const fetchSurveys = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('psq_surveys')
      .select('*, psq_responses(count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setSurveys(data);
    setLoading(false);
  };

  const handleCreateOpen = () => {
    setNewSurveyTitle(`PSQ Cycle ${new Date().getFullYear()}`);
    setIsModalOpen(true);
  };

  const createSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        const { data } = await supabase
        .from('psq_surveys')
        .insert({ user_id: user.id, title: newSurveyTitle })
        .select()
        .single();

        if (data) {
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
    if (!error) {
      setSurveys(surveys.filter(s => s.id !== id));
    }
  };

  if (userLoading) return null;
  
  return (
    <section className="bg-[var(--umbil-bg)] min-h-screen">
      <div className="container mx-auto max-w-[1000px] px-5 py-8 pb-20">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div>
                <h1 className="text-3xl font-bold text-[var(--umbil-text)] mb-2">Patient Feedback</h1>
                <p className="text-[var(--umbil-muted)] text-lg">Collect and analyze anonymous feedback for your revalidation.</p>
            </div>
            <button onClick={handleCreateOpen} className="btn btn--primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-teal-500/20">
                <Plus size={20} /> New Cycle
            </button>
        </div>

        {/* List Section */}
        {loading ? (
           <div className="space-y-4">
             {[1, 2].map(i => <div key={i} className="h-24 bg-[var(--umbil-surface)] rounded-xl animate-pulse"></div>)}
           </div>
        ) : surveys.length === 0 ? (
          <div className="bg-[var(--umbil-surface)] border-2 border-dashed border-[var(--umbil-divider)] rounded-xl p-12 text-center">
             <h3 className="text-xl font-bold mb-2">No feedback cycles yet</h3>
             <p className="text-[var(--umbil-muted)] mb-6">Start a new collection cycle to get a unique link.</p>
             <button onClick={handleCreateOpen} className="btn btn--outline">Start First Cycle</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {surveys.map((survey) => {
              const responseCount = survey.psq_responses?.[0]?.count || 0;
              const isReady = responseCount >= 34;

              return (
                <Link key={survey.id} href={`/psq/${survey.id}`} className="block group">
                  <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6 hover:shadow-md transition-all flex items-center justify-between">
                    
                    <div className="flex items-center gap-6">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isReady ? 'bg-emerald-100 text-emerald-600' : 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)]'}`}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[var(--umbil-text)] group-hover:text-[var(--umbil-brand-teal)] transition-colors">
                                {survey.title}
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-[var(--umbil-muted)]">
                                    {new Date(survey.created_at).toLocaleDateString()}
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                    {responseCount} / 34 Responses
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <button onClick={(e) => deleteSurvey(survey.id, e)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                      <ChevronRight size={20} className="text-gray-300 group-hover:text-[var(--umbil-brand-teal)]" />
                    </div>

                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4`}>
            <div className={`bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 ${styles.animateIn} ${styles.zoomIn95} duration-200`}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Start New Cycle</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                <form onSubmit={createSurvey}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Cycle Name</label>
                    <input 
                        type="text" 
                        value={newSurveyTitle}
                        onChange={(e) => setNewSurveyTitle(e.target.value)}
                        placeholder="e.g. PSQ 2026"
                        className="w-full p-3 border border-gray-300 rounded-xl mb-8 focus:border-teal-500 outline-none"
                        autoFocus
                    />
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl">
                            Cancel
                        </button>
                        <button type="submit" disabled={creating} className="flex-1 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700">
                            {creating ? 'Creating...' : 'Create Cycle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </section>
  );
}