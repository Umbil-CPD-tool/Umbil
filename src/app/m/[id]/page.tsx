// src/app/msf/[id]/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Copy, Mail, Plus, Trash2, CheckCircle2, Lock, Sparkles, Download, FileText, Check, ExternalLink } from 'lucide-react';
import MsfPdfDocument from '@/components/MsfPdfDocument';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { MSF_QUESTIONS } from '@/lib/msf-questions';

export default function MSFDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'share_and_gather' | 'results_and_reflection'>('share_and_gather');
  const [cycle, setCycle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Custom Questions State
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [savingQuestions, setSavingQuestions] = useState(false);

  // AI Summary State
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    // Check URL search params for default tab
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam === 'results_and_reflection' || tabParam === 'share_and_gather') {
        setActiveTab(tabParam as any);
    }
    fetchCycle();
  }, [resolvedParams.id]);

  const fetchCycle = async () => {
    // FIX: Include msf_responses(id) to ensure we get an accurate, live response count for the progress bar
    const { data, error } = await supabase
      .from('msf_cycles')
      .select('*, msf_responses(id)')
      .eq('id', resolvedParams.id)
      .single();

    if (!error && data) {
      if (data.custom_questions) setCustomQuestions(data.custom_questions);
      // Map the responses correctly for our local state
      data.response_count = data.msf_responses?.length || 0;
      setCycle(data);
    }
    setLoading(false);
  };

  const saveCustomQuestions = async (updated: string[]) => {
    setSavingQuestions(true);
    setCustomQuestions(updated);
    
    await supabase
      .from('msf_cycles')
      .update({ custom_questions: updated })
      .eq('id', resolvedParams.id);
      
    setSavingQuestions(false);
  };

  const addCustomQuestion = () => {
    if (customQuestions.length >= 2) return;
    saveCustomQuestions([...customQuestions, ""]);
  };

  const updateCustomQuestion = (idx: number, val: string) => {
    const updated = [...customQuestions];
    updated[idx] = val;
    setCustomQuestions(updated); 
  };

  const commitCustomQuestion = () => {
    saveCustomQuestions(customQuestions);
  };

  const removeCustomQuestion = (idx: number) => {
    const updated = customQuestions.filter((_, i) => i !== idx);
    saveCustomQuestions(updated);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/m/${cycle.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseCycle = async () => {
    if (!window.confirm("Are you sure? Colleagues will no longer be able to submit feedback once closed.")) return;
    
    const { error } = await supabase
      .from('msf_cycles')
      .update({ status: 'closed' })
      .eq('id', cycle.id);
      
    if (!error) {
      fetchCycle();
      setActiveTab('results_and_reflection');
    }
  };

  const handlePayment = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'msf', id: cycle.id }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Payment setup failed. Please try again.");
    } catch (err) {
      console.error(err);
      alert("Something went wrong with the payment request.");
    } finally {
      setCheckoutLoading(false);
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
  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/m/${cycle.id}`;

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
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">Closed</span>
                ) : (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${isThresholdMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        Gathering Feedback
                    </span>
                )}
              </div>
              <span className="text-sm text-[var(--umbil-muted)] ml-2">• Created {new Date(cycle.created_at).toLocaleDateString()}</span>
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
        
        {/* TAB: SHARE & GATHER */}
        {activeTab === 'share_and_gather' && (
          <div className="animate-in fade-in duration-300 space-y-12">
            
            {/* Share Section */}
            <div>
                <h2 className="text-xl font-bold mb-6 text-[var(--umbil-text)]">Share Cycle</h2>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-[var(--umbil-text)] mb-2">Unique Feedback Link</h2>
                            <p className="text-[var(--umbil-muted)] text-sm mb-6">Share this anonymous link with your clinical and non-clinical colleagues. No login is required for them.</p>
                            
                            <div className="flex gap-2 mb-6">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={publicUrl}
                                    className="flex-1 px-4 py-3 bg-[var(--umbil-hover-bg)] border border-[var(--umbil-divider)] rounded-xl text-[var(--umbil-text)] outline-none font-mono text-sm"
                                />
                                <button 
                                    onClick={copyLink}
                                    className="btn btn--outline flex items-center gap-2"
                                    style={copied ? { borderColor: 'var(--umbil-brand-teal)', color: 'var(--umbil-brand-teal)', backgroundColor: 'rgba(31, 184, 205, 0.05)'} : {}}
                                >
                                    {copied ? <Check size={18}/> : <Copy size={18} />} {copied ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-[var(--umbil-divider)] pt-6">
                            <h3 className="font-bold text-[var(--umbil-text)] mb-3">Quick Email Invite</h3>
                            <p className="text-[var(--umbil-muted)] text-sm mb-4">Click below to open your default email app with a pre-written invite.</p>
                            <a 
                                href={`mailto:?subject=${encodeURIComponent("Feedback Request for Appraisal")}&body=${encodeURIComponent(`Dear Colleague,\n\nI would be grateful if you could provide some 360-degree feedback for my upcoming appraisal. It is completely anonymous and should only take 3 minutes.\n\nLink: ${publicUrl}\n\nThank you!`)}`} 
                                className="w-full flex justify-center items-center gap-2 py-3 bg-teal-50 text-[var(--umbil-brand-teal)] font-bold rounded-xl hover:bg-teal-100 transition-colors"
                            >
                                <Mail size={18} /> Draft Email
                            </a>
                        </div>
                    </div>

                    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div>
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
                                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-start gap-3 mt-4">
                                    <CheckCircle2 className="shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold">Anonymity Threshold Met!</p>
                                        <p className="text-sm mt-1">You have enough responses to safely view the aggregated data without compromising colleague anonymity. You can close this cycle now.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-amber-50 text-amber-700 p-4 rounded-xl flex items-start gap-3 mt-4">
                                    <Lock className="shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold">Results are Locked</p>
                                        <p className="text-sm mt-1">To protect the identity of your colleagues, results and reports cannot be viewed until the minimum threshold of {required} responses is reached.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Configure Questions Section */}
            <div className="border-t border-[var(--umbil-divider)] pt-12">
                <h2 className="text-xl font-bold mb-6 text-[var(--umbil-text)]">Survey Preview & Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Left: Configuration */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6">
                            <h3 className="font-bold text-sm uppercase text-[var(--umbil-muted)] mb-4">Core Questions</h3>
                            <p className="text-sm text-[var(--umbil-text)] mb-2">
                                The core questions are fixed to ensure GMC compliance.
                            </p>
                            <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded">
                                <Lock size={12}/> Standardised Set Active
                            </div>
                        </div>

                        <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6">
                            <h3 className="font-bold text-sm uppercase text-[var(--umbil-muted)] mb-4">Custom Questions</h3>
                            <p className="text-sm text-[var(--umbil-text)] mb-4">
                                Add up to 2 optional questions specific to your practice.
                            </p>
                            
                            {isClosed ? (
                                <div className="p-4 bg-gray-50 text-gray-600 rounded-xl text-center font-semibold text-sm">
                                    Cycle is closed. Questions cannot be edited.
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3 mb-4">
                                        {customQuestions.map((q, i) => (
                                            <div key={i} className="relative group">
                                                <input 
                                                    type="text" 
                                                    value={q}
                                                    onChange={(e) => updateCustomQuestion(i, e.target.value)}
                                                    onBlur={commitCustomQuestion}
                                                    placeholder="e.g. How was my QIP rollout?"
                                                    className="w-full p-3 pr-10 border border-gray-200 rounded-lg text-sm focus:border-[var(--umbil-brand-teal)] outline-none bg-[var(--umbil-bg)] text-[var(--umbil-text)]"
                                                />
                                                <button 
                                                    onClick={() => removeCustomQuestion(i)}
                                                    className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500"
                                                >
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {customQuestions.length < 2 && (
                                        <button 
                                            onClick={addCustomQuestion}
                                            className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[var(--umbil-brand-teal)] hover:text-[var(--umbil-brand-teal)] transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus size={16}/> Add Question
                                        </button>
                                    )}
                                    {savingQuestions && <p className="text-xs text-[var(--umbil-muted)] mt-2 text-center">Saving...</p>}
                                </>
                            )}
                        </div>

                        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary w-full flex items-center justify-center gap-2">
                            View Live Survey <ExternalLink size={14}/>
                        </a>
                    </div>

                    {/* Right: Preview (Text only for MSF to save space) */}
                    <div className="md:col-span-2">
                        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                             <div className="text-center pb-6 border-b border-gray-100 mb-6">
                                <h4 className="font-bold text-xl text-gray-900">{cycle.title || 'MSF Cycle'}</h4>
                                <p className="text-sm text-gray-500 mt-2">I would be grateful if you could provide some 360-degree feedback for my upcoming appraisal.</p>
                            </div>
                            
                            <div className="space-y-4 opacity-75 hover:opacity-100 transition-opacity">
                                <h5 className="font-bold text-sm text-gray-900">Ratings (1-5 Scale)</h5>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700 mb-6">
                                    {MSF_QUESTIONS.map((q) => (
                                        <li key={q.id}>{q.text}</li>
                                    ))}
                                </ul>

                                <h5 className="font-bold text-sm text-gray-900 pt-4 border-t border-gray-100">Free Text</h5>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                                    <li>What does this doctor do particularly well?</li>
                                    <li>Are there any areas where this doctor could improve or develop?</li>
                                </ul>

                                {customQuestions.length > 0 && (
                                    <div className="border-t border-dashed border-gray-200 pt-6 mt-6">
                                        <p className="text-xs font-bold uppercase text-teal-600 mb-4">Your Custom Questions</p>
                                        {customQuestions.map((q, i) => (
                                            <div key={`c-${i}`} className="flex gap-4 mb-4">
                                                <span className="text-xs font-bold text-gray-300 mt-1 w-6">+</span>
                                                <div>
                                                    <p className="font-medium text-gray-800 text-sm">{q || "New question..."}</p>
                                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Optional</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        )}

        {/* TAB: RESULTS & REFLECTION */}
        {activeTab === 'results_and_reflection' && (
          <div className="animate-in fade-in duration-300">
            {!isClosed ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center max-w-2xl mx-auto">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={24}/>
                    </div>
                    <h3 className="text-xl font-bold text-amber-900 mb-2">Results Locked</h3>
                    <p className="text-amber-800 mb-6">
                        To protect anonymity and ensure statistical validity, results are hidden until you receive <strong>{required} responses</strong>.
                    </p>
                    <div className="bg-white rounded-full h-4 w-64 mx-auto overflow-hidden border border-amber-200 mb-2">
                        <div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: `${Math.min(100, (responses / required) * 100)}%` }}/>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                        {responses} / {required} Responses
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
                    <button 
                        onClick={handlePayment} 
                        disabled={checkoutLoading} 
                        className="btn btn--primary px-8 py-4 text-lg w-full max-w-md mx-auto flex justify-center items-center gap-2"
                    >
                        {checkoutLoading ? 'Loading...' : 'Unlock Now (£24)'}
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-8">
                    {/* PDF Export */}
                    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-8 shadow-sm text-center">
                        <div className="w-16 h-16 bg-teal-50 text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-4">
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

                    {/* Render AI Summary if it exists */}
                    {aiSummary && (
                        <div className="md:col-span-2 mt-4 bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-8 shadow-sm">
                            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2 text-[var(--umbil-text)]">
                                ✨ AI Executive Summary & Reflection
                            </h3>
                            <div className="prose max-w-none whitespace-pre-wrap text-[var(--umbil-text)]">
                                {aiSummary}
                            </div>
                        </div>
                    )}
                </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}