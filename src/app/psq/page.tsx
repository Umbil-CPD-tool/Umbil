// src/app/psq/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Copy, Check, FileText, ChevronRight, Trash2, X, Users, MessageSquare } from 'lucide-react';
import { useUserEmail } from "@/hooks/useUser";
import MsfPdfDocument from '@/components/MsfPdfDocument';
import { PDFDownloadLink } from '@react-pdf/renderer';
import styles from './psq.module.css';

export default function PSQDashboard() {
  const [activeTab, setActiveTab] = useState<'psq' | 'msf'>('psq');
  const { email, loading: userLoading } = useUserEmail();

  // --- PSQ State ---
  const [surveys, setSurveys] = useState<any[]>([]);
  const [psqLoading, setPsqLoading] = useState(true);
  
  // PSQ Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSurveyTitle, setNewSurveyTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // --- MSF State ---
  const [msfCycles, setMsfCycles] = useState<any[]>([]);
  const [msfLoading, setMsfLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  // UseEffect mapping based on active tab
  useEffect(() => {
    if (email) {
      if (activeTab === 'psq') fetchSurveys();
      if (activeTab === 'msf') fetchMsfCycles();
    }
  }, [email, activeTab]);

  // --- PSQ Functions ---
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

  // --- MSF Functions ---
  const fetchMsfCycles = async () => {
    setMsfLoading(true);
    try {
      const res = await fetch('/api/msf/cycle');
      const data = await res.json();
      setMsfCycles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setMsfLoading(false);
    }
  };

  const startNewMsfCycle = async () => {
    setMsfLoading(true);
    await fetch('/api/msf/cycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ required_responses: 10 }),
    });
    fetchMsfCycles();
  };

  const closeMsfCycle = async (id: string) => {
    setMsfLoading(true);
    await fetch('/api/msf/cycle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycle_id: id, status: 'closed' }),
    });
    fetchMsfCycles();
  };

  const generateMsfAiSummary = async (cycleId: string) => {
    setGeneratingAi(true);
    try {
      const res = await fetch('/api/msf/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle_id: cycleId }),
      });
      const data = await res.json();
      if (data.summary) setAiSummary(data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAi(false);
    }
  };

  // MSF Derived State
  const activeMsfCycle = msfCycles.find(c => c.status === 'open');
  const pastMsfCycles = msfCycles.filter(c => c.status === 'closed');

  if (userLoading) return null;
  
  return (
    <section className="bg-[var(--umbil-bg)] min-h-screen">
      <div className="container mx-auto max-w-[1000px] px-5 py-8 pb-20">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
                <h1 className="text-3xl font-bold text-[var(--umbil-text)] mb-2">Appraisals Hub</h1>
                <p className="text-[var(--umbil-muted)] text-lg">Manage your patient (PSQ) and colleague (MSF) feedback cycles for revalidation.</p>
            </div>
            {activeTab === 'psq' && (
                <button onClick={handleCreateOpen} className="btn btn--primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-teal-500/20 whitespace-nowrap">
                    <Plus size={20} /> New PSQ Cycle
                </button>
            )}
            {activeTab === 'msf' && !activeMsfCycle && (
                 <button onClick={startNewMsfCycle} className="btn btn--primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-teal-500/20 whitespace-nowrap">
                 <Plus size={20} /> Start MSF Cycle
             </button>
            )}
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[var(--umbil-surface)] border border-[var(--umbil-divider)] rounded-xl p-1 mb-8 w-full max-w-md">
            <button 
                onClick={() => setActiveTab('psq')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 ${activeTab === 'psq' ? 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)] shadow-sm' : 'text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] hover:bg-gray-50/50'}`}
            >
                <Users size={18} />
                My PSQ
            </button>
            <button 
                onClick={() => setActiveTab('msf')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 ${activeTab === 'msf' ? 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)] shadow-sm' : 'text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] hover:bg-gray-50/50'}`}
            >
                <MessageSquare size={18} />
                My MSF
            </button>
        </div>

        {/* Content Area - PSQ */}
        {activeTab === 'psq' && (
            <div>
                {psqLoading ? (
                <div className="space-y-4">
                    {[1, 2].map(i => <div key={i} className="h-24 bg-[var(--umbil-surface)] rounded-xl animate-pulse"></div>)}
                </div>
                ) : surveys.length === 0 ? (
                <div className="bg-[var(--umbil-surface)] border-2 border-dashed border-[var(--umbil-divider)] rounded-xl p-12 text-center">
                    <h3 className="text-xl font-bold mb-2 text-[var(--umbil-text)]">No PSQ cycles yet</h3>
                    <p className="text-[var(--umbil-muted)] mb-6">Start a new collection cycle to get a unique patient survey link.</p>
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
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-muted)]'}`}>
                                            {responseCount} / 34 Responses
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                            <button onClick={(e) => deleteSurvey(survey.id, e)} className="p-2 text-[var(--umbil-muted)] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={18} />
                            </button>
                            <ChevronRight size={20} className="text-[var(--umbil-muted)] group-hover:text-[var(--umbil-brand-teal)]" />
                            </div>

                        </div>
                        </Link>
                    );
                    })}
                </div>
                )}
            </div>
        )}

        {/* Content Area - MSF */}
        {activeTab === 'msf' && (
            <div className="animate-in fade-in duration-300">
                {msfLoading && msfCycles.length === 0 ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => <div key={i} className="h-24 bg-[var(--umbil-surface)] rounded-xl animate-pulse"></div>)}
                    </div>
                ) : (
                    <>
                        {activeMsfCycle ? (
                            <div className="bg-[var(--umbil-surface)] rounded-xl shadow-sm border border-[var(--umbil-card-border)] p-6 mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-[var(--umbil-text)]">Active Feedback Cycle</h2>
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-bold">In Progress</span>
                            </div>

                            <div className="mb-8">
                                <label className="block text-sm font-bold text-[var(--umbil-text)] mb-2">Share this anonymous link with colleagues (WhatsApp/Email):</label>
                                <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={`${window.location.origin}/m/${activeMsfCycle.id}`}
                                    className="flex-1 px-4 py-2 bg-[var(--umbil-hover-bg)] border border-[var(--umbil-divider)] rounded-lg text-[var(--umbil-text)] outline-none"
                                />
                                <button 
                                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/m/${activeMsfCycle.id}`)}
                                    className="btn btn--outline whitespace-nowrap flex items-center gap-2"
                                >
                                    <Copy size={16} /> Copy Link
                                </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="flex justify-between text-sm mb-2">
                                <span className="font-bold text-[var(--umbil-text)]">Responses Gathered</span>
                                <span className="text-[var(--umbil-muted)]">{activeMsfCycle.response_count} / {activeMsfCycle.required_responses} Required</span>
                                </div>
                                <div className="w-full bg-[var(--umbil-divider)] rounded-full h-3">
                                <div 
                                    className="bg-[var(--umbil-brand-teal)] h-3 rounded-full transition-all duration-500" 
                                    style={{ width: `${Math.min(100, (activeMsfCycle.response_count / activeMsfCycle.required_responses) * 100)}%` }}
                                ></div>
                                </div>
                                {activeMsfCycle.response_count < activeMsfCycle.required_responses ? (
                                <p className="text-sm text-[var(--umbil-muted)] mt-3 flex items-center gap-1">
                                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    Results remain locked until the required threshold is met to protect anonymity.
                                </p>
                                ) : (
                                <p className="text-sm text-emerald-600 mt-3 font-bold">
                                    Threshold met! You can now close this cycle and generate your report.
                                </p>
                                )}
                            </div>

                            <button 
                                disabled={activeMsfCycle.response_count < activeMsfCycle.required_responses}
                                onClick={() => closeMsfCycle(activeMsfCycle.id)}
                                className={`w-full py-3 rounded-xl font-bold transition-all ${
                                activeMsfCycle.response_count >= activeMsfCycle.required_responses 
                                    ? 'bg-[var(--umbil-brand-teal)] text-white hover:bg-teal-700' 
                                    : 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-muted)] cursor-not-allowed'
                                }`}
                            >
                                Close Cycle & Generate Report
                            </button>
                            </div>
                        ) : (
                            msfCycles.length === 0 && (
                                <div className="bg-[var(--umbil-surface)] border-2 border-dashed border-[var(--umbil-divider)] rounded-xl p-12 text-center mt-4">
                                    <div className="w-16 h-16 bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <MessageSquare size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2 text-[var(--umbil-text)]">Multi-Source Feedback (MSF)</h3>
                                    <p className="text-[var(--umbil-muted)] mb-6 max-w-md mx-auto">
                                        Gather anonymous feedback from clinical and non-clinical colleagues for your appraisal.
                                    </p>
                                    <button onClick={startNewMsfCycle} className="btn btn--primary">Start First MSF Cycle</button>
                                </div>
                            )
                        )}

                        {pastMsfCycles.length > 0 && (
                            <div>
                            <h2 className="text-xl font-bold mb-4 text-[var(--umbil-text)]">Completed Appraisals</h2>
                            <div className="grid gap-4">
                                {pastMsfCycles.map(cycle => (
                                <div key={cycle.id} className="bg-[var(--umbil-surface)] p-5 rounded-xl border border-[var(--umbil-card-border)] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-shadow">
                                    <div>
                                    <p className="font-bold text-[var(--umbil-text)]">MSF Cycle - {new Date(cycle.created_at).toLocaleDateString()}</p>
                                    <p className="text-sm text-[var(--umbil-muted)]">{cycle.response_count} Responses</p>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                    <button 
                                        onClick={() => generateMsfAiSummary(cycle.id)}
                                        className="flex-1 sm:flex-none px-4 py-2 border border-[var(--umbil-brand-teal)] text-[var(--umbil-brand-teal)] bg-transparent rounded-lg hover:bg-[var(--umbil-hover-bg)] font-bold text-sm transition-colors"
                                    >
                                        {generatingAi ? 'Analyzing...' : '✨ Auto-Draft Reflection'}
                                    </button>
                                    <PDFDownloadLink
                                        document={<MsfPdfDocument cycleDate={new Date(cycle.created_at).toLocaleDateString()} responseCount={cycle.response_count} />}
                                        fileName={`MSF_Report_${new Date(cycle.created_at).toISOString().split('T')[0]}.pdf`}
                                        className="flex-1 sm:flex-none px-4 py-2 bg-[var(--umbil-text)] text-[var(--umbil-surface)] rounded-lg hover:opacity-90 font-bold text-sm text-center transition-opacity"
                                    >
                                        {({ loading }) => (loading ? 'Preparing...' : 'Download PDF')}
                                    </PDFDownloadLink>
                                    </div>
                                </div>
                                ))}
                            </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        )}

      </div>

      {/* PSQ Create Modal */}
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
                    <label className="block text-sm font-bold text-[var(--umbil-text)] mb-2">Cycle Name</label>
                    <input 
                        type="text" 
                        value={newSurveyTitle}
                        onChange={(e) => setNewSurveyTitle(e.target.value)}
                        placeholder="e.g. PSQ 2026"
                        className="w-full p-3 border border-[var(--umbil-divider)] bg-[var(--umbil-bg)] text-[var(--umbil-text)] rounded-xl mb-8 focus:border-[var(--umbil-brand-teal)] outline-none"
                        autoFocus
                    />
                    <div className="flex gap-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[var(--umbil-text)] font-bold hover:bg-[var(--umbil-hover-bg)] rounded-xl transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={creating} className="flex-1 py-3 bg-[var(--umbil-brand-teal)] text-white font-bold rounded-xl hover:bg-teal-700 transition-colors">
                            {creating ? 'Creating...' : 'Create Cycle'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* MSF AI Summary Modal */}
      {aiSummary && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--umbil-surface)] rounded-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-[var(--umbil-text)]">
              ✨ AI Executive Summary
            </h3>
            <div className="prose max-w-none whitespace-pre-wrap text-[var(--umbil-text)]">
              {aiSummary}
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={() => setAiSummary(null)} className="px-6 py-2 bg-[var(--umbil-hover-bg)] text-[var(--umbil-text)] rounded-xl font-bold hover:bg-[var(--umbil-divider)] transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}