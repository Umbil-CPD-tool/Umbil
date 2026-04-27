// src/app/msf/[id]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, Mail, Plus, Trash2, CheckCircle2, Lock, Sparkles, Download, FileText } from 'lucide-react';
import MsfPdfDocument from '@/components/MsfPdfDocument';
import { PDFDownloadLink } from '@react-pdf/renderer';

export default function MSFDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'questions' | 'share' | 'results'>('share');
  const [cycle, setCycle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Custom Questions State
  const [newQuestion, setNewQuestion] = useState('');
  const [savingQuestion, setSavingQuestion] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    // Check URL search params for default tab (e.g., ?tab=results)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'questions' || tabParam === 'share' || tabParam === 'results') {
        setActiveTab(tabParam);
    }
    fetchCycle();
  }, [resolvedParams.id]);

  const fetchCycle = async () => {
    const { data, error } = await supabase
      .from('msf_cycles')
      .select('*')
      .eq('id', resolvedParams.id)
      .single();

    if (!error && data) {
      // Ensure custom_questions is always an array
      if (!data.custom_questions) data.custom_questions = [];
      setCycle(data);
    }
    setLoading(false);
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) return;
    setSavingQuestion(true);
    
    const updatedQuestions = [...(cycle.custom_questions || []), newQuestion];
    
    const { error } = await supabase
      .from('msf_cycles')
      .update({ custom_questions: updatedQuestions })
      .eq('id', cycle.id);

    if (!error) {
      setCycle({ ...cycle, custom_questions: updatedQuestions });
      setNewQuestion('');
    }
    setSavingQuestion(false);
  };

  const handleDeleteQuestion = async (indexToRemove: number) => {
    const updatedQuestions = cycle.custom_questions.filter((_: any, i: number) => i !== indexToRemove);
    
    const { error } = await supabase
      .from('msf_cycles')
      .update({ custom_questions: updatedQuestions })
      .eq('id', cycle.id);

    if (!error) {
      setCycle({ ...cycle, custom_questions: updatedQuestions });
    }
  };

  const handleCloseCycle = async () => {
    if (!window.confirm("Are you sure? Colleagues will no longer be able to submit feedback once closed.")) return;
    
    const { error } = await supabase
      .from('msf_cycles')
      .update({ status: 'closed' })
      .eq('id', cycle.id);
      
    if (!error) {
      fetchCycle();
      setActiveTab('results');
    }
  };

  const generateMsfAiSummary = async () => {
    setGeneratingAi(true);
    try {
      const res = await fetch('/api/msf/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle_id: cycle.id }),
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

  if (loading) return <div className="min-h-screen bg-[var(--umbil-bg)] p-8 flex justify-center"><div className="animate-pulse h-8 w-32 bg-gray-200 rounded"></div></div>;
  if (!cycle) return <div className="min-h-screen bg-[var(--umbil-bg)] p-8 text-center text-[var(--umbil-muted)]">Cycle not found</div>;

  const responses = cycle.response_count || 0;
  const required = cycle.required_responses || 15;
  const isThresholdMet = responses >= required;
  const isClosed = cycle.status === 'closed';

  return (
    <section className="bg-[var(--umbil-bg)] min-h-screen pb-20">
      <div className="bg-[var(--umbil-surface)] border-b border-[var(--umbil-divider)] pt-8 pb-0 px-5 mb-8 sticky top-0 z-10">
        <div className="container mx-auto max-w-[1000px]">
          <Link href="/psq" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] mb-6 transition-colors">
            <ArrowLeft size={16} /> Back to Hub
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-[var(--umbil-text)]">{cycle.title || 'MSF Cycle'}</h1>
                {isClosed ? (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">Closed</span>
                ) : (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Gathering Feedback</span>
                )}
              </div>
              <p className="text-[var(--umbil-muted)]">
                {responses} of {required} required responses gathered.
              </p>
            </div>
            
            {/* Action Button */}
            {!isClosed && isThresholdMet && (
              <button onClick={handleCloseCycle} className="btn btn--primary bg-emerald-600 hover:bg-emerald-700">
                Close Cycle & Finalize
              </button>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-6 border-b border-[var(--umbil-divider)] overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setActiveTab('share')}
              className={`py-3 px-1 font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'share' ? 'border-[var(--umbil-brand-teal)] text-[var(--umbil-brand-teal)]' : 'border-transparent text-[var(--umbil-muted)] hover:text-[var(--umbil-text)]'}`}
            >
              Share & Gather
            </button>
            <button 
              onClick={() => setActiveTab('questions')}
              className={`py-3 px-1 font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'questions' ? 'border-[var(--umbil-brand-teal)] text-[var(--umbil-brand-teal)]' : 'border-transparent text-[var(--umbil-muted)] hover:text-[var(--umbil-text)]'}`}
            >
              Configure Questions
            </button>
            <button 
              onClick={() => setActiveTab('results')}
              className={`py-3 px-1 font-bold whitespace-nowrap transition-colors border-b-2 ${activeTab === 'results' ? 'border-[var(--umbil-brand-teal)] text-[var(--umbil-brand-teal)]' : 'border-transparent text-[var(--umbil-muted)] hover:text-[var(--umbil-text)]'}`}
            >
              Results & AI Summary
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-[1000px] px-5">
        
        {/* TAB: SHARE */}
        {activeTab === 'share' && (
          <div className="grid md:grid-cols-2 gap-8 animate-in fade-in duration-300">
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[var(--umbil-text)] mb-2">Unique Feedback Link</h2>
                <p className="text-[var(--umbil-muted)] text-sm mb-6">Share this anonymous link with your clinical and non-clinical colleagues. No login is required for them.</p>
                
                <div className="flex gap-2 mb-6">
                    <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}/m/${cycle.id}`}
                        className="flex-1 px-4 py-3 bg-[var(--umbil-hover-bg)] border border-[var(--umbil-divider)] rounded-xl text-[var(--umbil-text)] outline-none font-mono text-sm"
                    />
                    <button 
                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/m/${cycle.id}`)}
                        className="btn btn--outline flex items-center gap-2"
                    >
                        <Copy size={18} /> Copy
                    </button>
                </div>

                <div className="border-t border-[var(--umbil-divider)] pt-6">
                    <h3 className="font-bold text-[var(--umbil-text)] mb-3">Quick Email Invite</h3>
                    <p className="text-[var(--umbil-muted)] text-sm mb-4">Click below to open your default email app with a pre-written invite.</p>
                    <a 
                        href={`mailto:?subject=${encodeURIComponent("Feedback Request for Appraisal")}&body=${encodeURIComponent(`Dear Colleague,\n\nI would be grateful if you could provide some 360-degree feedback for my upcoming appraisal. It is completely anonymous and should only take 3 minutes.\n\nLink: ${window.location.origin}/m/${cycle.id}\n\nThank you!`)}`} 
                        className="w-full flex justify-center items-center gap-2 py-3 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition-colors"
                    >
                        <Mail size={18} /> Draft Email
                    </a>
                </div>
            </div>

            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[var(--umbil-text)] mb-6">Progress Tracking</h2>
                
                <div className="flex justify-between items-end mb-2">
                    <span className="text-4xl font-black text-[var(--umbil-brand-teal)]">{responses}</span>
                    <span className="text-[var(--umbil-muted)] font-bold mb-1">Target: {required}</span>
                </div>
                
                <div className="w-full bg-[var(--umbil-divider)] rounded-full h-4 mb-4">
                    <div 
                        className={`h-4 rounded-full transition-all duration-1000 ${isThresholdMet ? 'bg-emerald-500' : 'bg-[var(--umbil-brand-teal)]'}`}
                        style={{ width: `${Math.min(100, (responses / required) * 100)}%` }}
                    ></div>
                </div>

                {isThresholdMet ? (
                    <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-start gap-3">
                        <CheckCircle2 className="shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Anonymity Threshold Met!</p>
                            <p className="text-sm mt-1">You have enough responses to safely view the aggregated data without compromising colleague anonymity. You can close this cycle now.</p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-amber-50 text-amber-700 p-4 rounded-xl flex items-start gap-3">
                        <Lock className="shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Results are Locked</p>
                            <p className="text-sm mt-1">To protect the identity of your colleagues, results and reports cannot be viewed until the minimum threshold of {required} responses is reached.</p>
                        </div>
                    </div>
                )}
            </div>
          </div>
        )}

        {/* TAB: QUESTIONS */}
        {activeTab === 'questions' && (
          <div className="animate-in fade-in duration-300 max-w-3xl">
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 shadow-sm mb-6">
                <h2 className="text-xl font-bold text-[var(--umbil-text)] mb-2">Standard GMC Questions</h2>
                <p className="text-[var(--umbil-muted)] text-sm mb-4">These core domains are automatically included in every MSF to ensure compliance with appraisal standards.</p>
                
                <div className="bg-[var(--umbil-bg)] rounded-xl p-4 border border-[var(--umbil-divider)]">
                    <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--umbil-text)]">
                        <li>Clinical Assessment & Knowledge</li>
                        <li>Communication with Colleagues</li>
                        <li>Teamwork & Collaboration</li>
                        <li>Reliability & Punctuality</li>
                        <li>Free text: "What does this doctor do well?"</li>
                        <li>Free text: "Areas for improvement?"</li>
                    </ul>
                </div>
            </div>

            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-bold text-[var(--umbil-text)] mb-2">Add Custom Questions</h2>
                <p className="text-[var(--umbil-muted)] text-sm mb-6">Want feedback on a specific leadership role or teaching project? Add free-text questions here before sending out your link.</p>
                
                {isClosed ? (
                    <div className="p-4 bg-gray-50 text-gray-600 rounded-xl text-center font-semibold">
                        Cycle is closed. Questions cannot be edited.
                    </div>
                ) : (
                    <>
                        <div className="flex gap-2 mb-6">
                            <input 
                                type="text"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                placeholder="e.g. How effective was I during the QIP rollout?"
                                className="flex-1 p-3 border border-[var(--umbil-divider)] bg-[var(--umbil-bg)] text-[var(--umbil-text)] rounded-xl focus:border-[var(--umbil-brand-teal)] outline-none"
                            />
                            <button 
                                onClick={handleAddQuestion}
                                disabled={savingQuestion || !newQuestion.trim()}
                                className="px-6 py-3 bg-[var(--umbil-brand-teal)] text-white font-bold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                <Plus size={18} /> Add
                            </button>
                        </div>

                        {cycle.custom_questions?.length > 0 ? (
                            <div className="space-y-3">
                                {cycle.custom_questions.map((q: string, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-4 bg-[var(--umbil-bg)] border border-[var(--umbil-divider)] rounded-xl group">
                                        <p className="text-[var(--umbil-text)] text-sm">{q}</p>
                                        <button onClick={() => handleDeleteQuestion(i)} className="text-[var(--umbil-muted)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-6 border-2 border-dashed border-[var(--umbil-divider)] rounded-xl text-[var(--umbil-muted)] text-sm">
                                No custom questions added yet.
                            </div>
                        )}
                    </>
                )}
            </div>
          </div>
        )}

        {/* TAB: RESULTS */}
        {activeTab === 'results' && (
          <div className="animate-in fade-in duration-300">
            {!isClosed ? (
                <div className="bg-[var(--umbil-surface)] border-2 border-dashed border-[var(--umbil-divider)] rounded-2xl p-12 text-center max-w-2xl mx-auto">
                    <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-[var(--umbil-text)]">Results Locked</h3>
                    <p className="text-[var(--umbil-muted)] mb-6">
                        Results are completely hidden while the cycle is open to ensure colleagues feel safe leaving honest feedback. Once you click "Close Cycle" on the top right, reports will generate.
                    </p>
                </div>
            ) : !cycle.has_paid ? (
                <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm">
                    <div className="w-16 h-16 bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-[var(--umbil-text)]">Unlock Your Appraisal Report</h3>
                    <p className="text-[var(--umbil-muted)] mb-8">
                        Your {responses} anonymous responses have been securely collated. Unlock your GMC-compliant PDF export and automated AI reflection draft for £24.
                    </p>
                    <button className="btn btn--primary px-8 py-4 text-lg w-full max-w-md mx-auto flex justify-center items-center gap-2">
                        Unlock Now (£24)
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-8">
                    {/* PDF Export */}
                    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-8 shadow-sm text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-[var(--umbil-text)]">Official MSF Report</h3>
                        <p className="text-[var(--umbil-muted)] text-sm mb-8">Download your aggregated scores and free-text comments formatted for your appraisal portfolio.</p>
                        
                        <PDFDownloadLink
                            document={<MsfPdfDocument cycleDate={new Date(cycle.created_at).toLocaleDateString()} responseCount={responses} />}
                            fileName={`MSF_Report_${new Date(cycle.created_at).toISOString().split('T')[0]}.pdf`}
                            className="w-full flex justify-center items-center gap-2 py-4 bg-[var(--umbil-text)] text-[var(--umbil-surface)] font-bold rounded-xl hover:opacity-90 transition-opacity"
                        >
                            {({ loading }) => (loading ? 'Preparing Document...' : <><Download size={18}/> Download PDF</>)}
                        </PDFDownloadLink>
                    </div>

                    {/* AI Reflection */}
                    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-brand-teal)] shadow-[0_0_20px_rgba(20,184,166,0.1)] rounded-2xl p-8 text-center flex flex-col justify-between">
                        <div>
                            <div className="w-16 h-16 bg-teal-50 text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles size={32} />
                            </div>
                            <h3 className="text-xl font-bold mb-2 text-[var(--umbil-text)]">AI Reflection Assistant</h3>
                            <p className="text-[var(--umbil-muted)] text-sm mb-8">Let Umbil analyze your feedback and draft an executive summary and reflection piece for your portfolio.</p>
                        </div>
                        
                        <button 
                            onClick={generateMsfAiSummary}
                            disabled={generatingAi}
                            className="w-full flex justify-center items-center gap-2 py-4 bg-[var(--umbil-brand-teal)] text-white font-bold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-70"
                        >
                            {generatingAi ? 'Analyzing Feedback...' : '✨ Draft Summary'}
                        </button>
                    </div>
                </div>
            )}

            {/* Render AI Summary if it exists */}
            {aiSummary && (
                <div className="mt-8 bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-8 shadow-sm">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[var(--umbil-text)]">
                        ✨ AI Executive Summary
                    </h3>
                    <div className="prose max-w-none whitespace-pre-wrap text-[var(--umbil-text)]">
                        {aiSummary}
                    </div>
                </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}