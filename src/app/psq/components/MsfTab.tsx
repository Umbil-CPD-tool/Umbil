// src/app/psq/components/MsfTab.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Copy, Check, X, MessageSquare, Lock, Mail } from 'lucide-react';
import { useUserEmail } from "@/hooks/useUser";
import MsfPdfDocument from '@/components/MsfPdfDocument';
import { PDFDownloadLink } from '@react-pdf/renderer';
import styles from '../psq.module.css';

export default function MsfTab() {
  const { email } = useUserEmail();
  const [msfCycles, setMsfCycles] = useState<any[]>([]);
  const [msfLoading, setMsfLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('msf_cycles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMsfCycles(data || []);
    } catch (err) {
      console.error("Error fetching MSF:", err);
    } finally {
      setMsfLoading(false);
    }
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
      const { error } = await supabase.from('msf_cycles').insert({ 
        user_id: user.id, title: newMsfTitle, required_responses: msfThreshold, status: 'open'
      });
      if (error) {
          console.error("Error creating MSF:", error);
          alert("Failed to create MSF cycle.");
      } else {
          fetchMsfCycles();
          setIsMsfModalOpen(false);
      }
    }
    setCreatingMsf(false);
  };

  const closeMsfCycle = async (id: string) => {
    setMsfLoading(true);
    await supabase.from('msf_cycles').update({ status: 'closed' }).eq('id', id);
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
      alert("Failed to generate AI summary.");
    } finally {
      setGeneratingAi(false);
    }
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

  const activeMsfCycle = msfCycles.find(c => c.status === 'open');
  const pastMsfCycles = msfCycles.filter(c => c.status === 'closed');

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
              <h1 className="text-3xl font-bold text-[var(--umbil-text)] mb-2">Multi-Source Feedback (MSF)</h1>
              <p className="text-[var(--umbil-muted)] text-lg">Gather anonymous feedback from clinical and non-clinical colleagues for your appraisal.</p>
          </div>
          {!activeMsfCycle && (
              <button onClick={handleMsfCreateOpen} className="btn btn--primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-teal-500/20 whitespace-nowrap">
                  <Plus size={20} /> Start MSF Cycle
              </button>
          )}
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
      {msfLoading && msfCycles.length === 0 ? (
          <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="h-24 bg-[var(--umbil-surface)] rounded-xl animate-pulse"></div>)}
          </div>
      ) : (
          <>
              {activeMsfCycle ? (
                  <div className="bg-[var(--umbil-surface)] rounded-xl shadow-sm border border-[var(--umbil-card-border)] p-6 mb-8">
                      <div className="flex items-center justify-between mb-6">
                          <h2 className="text-xl font-semibold text-[var(--umbil-text)]">{activeMsfCycle.title || 'Active Feedback Cycle'}</h2>
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-bold">In Progress</span>
                      </div>

                      <div className="mb-8">
                          <label className="block text-sm font-bold text-[var(--umbil-text)] mb-2">Share this anonymous link with colleagues:</label>
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
                                  <Copy size={16} /> Copy
                              </button>
                          </div>
                          <div className="mt-4">
                              <a 
                                  href={`mailto:?subject=${encodeURIComponent("Feedback Request for Appraisal")}&body=${encodeURIComponent(`Dear Colleague,\n\nI would be grateful if you could provide some 360-degree feedback for my upcoming appraisal. It is completely anonymous and should only take 3 minutes.\n\nLink: ${window.location.origin}/m/${activeMsfCycle.id}\n\nThank you!`)}`} 
                                  className="btn btn--outline w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                              >
                                  <Mail size={16} /> Nominate Colleagues via Email
                              </a>
                          </div>
                      </div>

                      <div className="mb-6">
                          <div className="flex justify-between text-sm mb-2">
                          <span className="font-bold text-[var(--umbil-text)]">Responses Gathered</span>
                          <span className="text-[var(--umbil-muted)]">{activeMsfCycle.response_count || 0} / {activeMsfCycle.required_responses} Required</span>
                          </div>
                          <div className="w-full bg-[var(--umbil-divider)] rounded-full h-3">
                          <div 
                              className="bg-[var(--umbil-brand-teal)] h-3 rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, ((activeMsfCycle.response_count || 0) / activeMsfCycle.required_responses) * 100)}%` }}
                          ></div>
                          </div>
                          {(activeMsfCycle.response_count || 0) < activeMsfCycle.required_responses ? (
                          <p className="text-sm text-[var(--umbil-muted)] mt-3 flex items-center gap-1">
                              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                              Results remain locked until the required threshold is met to protect anonymity.
                          </p>
                          ) : (
                          <p className="text-sm text-emerald-600 mt-3 font-bold">
                              Threshold met! You can now close this cycle and finalize.
                          </p>
                          )}
                      </div>

                      <button 
                          disabled={(activeMsfCycle.response_count || 0) < activeMsfCycle.required_responses}
                          onClick={() => closeMsfCycle(activeMsfCycle.id)}
                          className={`w-full py-3 rounded-xl font-bold transition-all ${
                          (activeMsfCycle.response_count || 0) >= activeMsfCycle.required_responses 
                              ? 'bg-[var(--umbil-brand-teal)] text-white hover:bg-teal-700' 
                              : 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-muted)] cursor-not-allowed'
                          }`}
                      >
                          Close Cycle & Prepare Report
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
                              You haven't started any colleague feedback cycles yet. Start a cycle to get a unique MSF survey link.
                          </p>
                          <button onClick={handleMsfCreateOpen} className="btn btn--outline">Start First MSF Cycle</button>
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
                          <p className="font-bold text-[var(--umbil-text)]">{cycle.title || 'MSF Cycle'} - {new Date(cycle.created_at).toLocaleDateString()}</p>
                          <p className="text-sm text-[var(--umbil-muted)]">{cycle.response_count || 0} Responses Collected</p>
                          </div>
                          
                          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                              {cycle.has_paid ? (
                                  <>
                                      <button 
                                          onClick={() => generateMsfAiSummary(cycle.id)}
                                          className="flex-1 sm:flex-none px-4 py-2 border border-[var(--umbil-brand-teal)] text-[var(--umbil-brand-teal)] bg-transparent rounded-lg hover:bg-[var(--umbil-hover-bg)] font-bold text-sm transition-colors"
                                      >
                                          {generatingAi ? 'Analyzing...' : '✨ Auto-Draft Reflection'}
                                      </button>
                                      <PDFDownloadLink
                                          document={<MsfPdfDocument cycleDate={new Date(cycle.created_at).toLocaleDateString()} responseCount={cycle.response_count || 0} />}
                                          fileName={`MSF_Report_${new Date(cycle.created_at).toISOString().split('T')[0]}.pdf`}
                                          className="flex-1 sm:flex-none px-4 py-2 bg-[var(--umbil-text)] text-[var(--umbil-surface)] rounded-lg hover:opacity-90 font-bold text-sm text-center transition-opacity"
                                      >
                                          {({ loading }) => (loading ? 'Preparing...' : 'Download PDF')}
                                      </PDFDownloadLink>
                                  </>
                              ) : (
                                  <button 
                                      onClick={() => handlePayment(cycle.id)}
                                      disabled={checkoutLoading === cycle.id}
                                      className="w-full sm:w-auto px-6 py-2 flex items-center justify-center gap-2 bg-[var(--umbil-text)] text-[var(--umbil-surface)] rounded-lg hover:opacity-90 font-bold text-sm transition-opacity"
                                  >
                                      {checkoutLoading === cycle.id ? 'Loading...' : <><Lock size={14}/> Unlock Report & AI (£24)</>}
                                  </button>
                              )}
                          </div>
                      </div>
                      ))}
                  </div>
                  </div>
              )}
          </>
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

      {/* AI Summary Modal */}
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
    </div>
  );
}