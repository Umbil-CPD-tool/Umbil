'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  ArrowLeft, Copy, ExternalLink, Lock, CheckCircle2, 
  BarChart3, FileText, Share2, Eye, Printer, AlertTriangle, Sparkles, Check, Tablet,
  Plus, Trash2, Save, Download, QrCode
} from 'lucide-react';
import { PSQ_QUESTIONS, PSQ_SCALE, PSQ_FOOTER_TEXT, PSQ_INTRO } from '@/lib/psq-questions';
import { calculateAnalytics, AnalyticsResult } from '@/lib/psq-analytics';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip
} from 'recharts';

export default function PSQCyclePage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'preview' | 'share' | 'results' | 'reflection'>('preview');
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Custom Questions State
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [savingQuestions, setSavingQuestions] = useState(false);

  // Results State
  const [showComments, setShowComments] = useState(false);
  
  // Reflection State
  const [reflection, setReflection] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);

  useEffect(() => {
    fetchCycleData();
  }, [id]);

  const fetchCycleData = async () => {
    if (!id) return;
    
    // Fetch Survey + Responses
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
    if (data.custom_questions) setCustomQuestions(data.custom_questions);
    
    const result = calculateAnalytics([data]);
    setAnalytics(result);
    setLoading(false);
  };

  const saveCustomQuestions = async (updated: string[]) => {
    setSavingQuestions(true);
    setCustomQuestions(updated);
    
    await supabase
      .from('psq_surveys')
      .update({ custom_questions: updated })
      .eq('id', id);
      
    setSavingQuestions(false);
  };

  const addCustomQuestion = () => {
    if (customQuestions.length >= 2) return;
    saveCustomQuestions([...customQuestions, ""]);
  };

  const updateCustomQuestion = (idx: number, val: string) => {
    const updated = [...customQuestions];
    updated[idx] = val;
    setCustomQuestions(updated); // Optimistic update
  };

  const commitCustomQuestion = () => {
    saveCustomQuestions(customQuestions);
  };

  const removeCustomQuestion = (idx: number) => {
    const updated = customQuestions.filter((_, i) => i !== idx);
    saveCustomQuestions(updated);
  };

  const copyLink = () => {
    const url = `${window.location.origin}/s/${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openKioskMode = () => {
      window.open(`/s/${id}?kiosk=true`, '_blank');
  };

  const handleGenerateReflection = async () => {
    if (!analytics || !analytics.stats.thresholdMet) return;
    setIsGenerating(true);
    setReflection('');

    try {
        const response = await fetch('/api/generate-reflection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'psq_analysis',
                stats: analytics.stats,
                strengths: analytics.stats.topArea,
                weaknesses: analytics.stats.lowestArea,
                comments: analytics.textFeedback.slice(0, 5).map(t => t.good || t.improve).filter(Boolean)
            })
        });

        if (!response.body) throw new Error("No stream");
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value);
            setReflection((prev) => prev + chunkValue);
        }

    } catch (e) {
        console.error(e);
        alert("Failed to generate reflection.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSaveToLog = async () => {
      if (!reflection) return;
      setIsSavingLog(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('cpd_entries').insert({
          user_id: user.id,
          title: `Reflection on Patient Feedback (Cycle: ${survey.title})`,
          content: reflection,
          type: 'reflection',
          tags: ['PSQ', 'Patient Feedback', 'Domain 3', 'Domain 4'],
          date: new Date().toISOString()
      });

      if (error) {
          alert("Could not save to learning log.");
      } else {
          alert("Saved to Learning Log successfully.");
      }
      setIsSavingLog(false);
  };

  const handlePrintReport = () => {
      window.print();
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-teal-500 rounded-full border-t-transparent"></div></div>;

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${id}`;

  return (
    <section className="bg-[var(--umbil-bg)] min-h-screen pb-20 print:bg-white print:pb-0">
      
      {/* PRINT STYLES - Hidden in App */}
      <style jsx global>{`
        @media print {
            body { background: white; }
            nav, .no-print { display: none !important; }
            .print-only { display: block !important; }
            .page-break { page-break-after: always; }
        }
        .print-only { display: none; }
      `}</style>

      {/* PRINT REPORT TEMPLATE */}
      <div className="print-only max-w-[800px] mx-auto p-10">
         <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
             <div>
                <h1 className="text-2xl font-bold text-black">Patient Feedback Report</h1>
                <p className="text-gray-600">{survey.title} • {new Date(survey.created_at).toLocaleDateString()}</p>
             </div>
             <div className="text-right">
                <div className="text-3xl font-bold">{analytics?.stats.averageScore} <span className="text-sm text-gray-500 font-normal">/ 5.0</span></div>
                <div className="text-xs uppercase tracking-wide text-gray-500">{analytics?.stats.totalResponses} Responses</div>
             </div>
         </div>

         <div className="mb-8">
             <h3 className="font-bold border-b border-gray-200 mb-4 pb-2">Domain Scores</h3>
             {analytics?.breakdown.map((b: any) => (
                 <div key={b.name} className="flex justify-between items-center py-2 border-b border-gray-100">
                     <span className="text-sm font-medium">{b.name}</span>
                     <span className="font-bold">{b.score}</span>
                 </div>
             ))}
         </div>

         <div className="mb-8">
             <h3 className="font-bold border-b border-gray-200 mb-4 pb-2">Patient Comments (Themes)</h3>
             {analytics?.textFeedback.slice(0, 10).map((fb, i) => (
                 <div key={i} className="mb-3 text-sm">
                     {fb.good && <p className="mb-1"><span className="font-bold text-green-700">[+]</span> {fb.good}</p>}
                     {fb.improve && <p><span className="font-bold text-amber-700">[-]</span> {fb.improve}</p>}
                 </div>
             ))}
         </div>

         <div className="mt-12 text-xs text-gray-500 border-t border-gray-200 pt-4 text-center">
             {PSQ_FOOTER_TEXT}
         </div>
      </div>

      {/* APP UI */}
      <div className="container mx-auto max-w-[1000px] px-5 py-8 no-print">
        
        {/* Top Nav */}
        <div className="mb-6">
          <Link href="/psq" className="inline-flex items-center gap-2 text-[var(--umbil-muted)] hover:text-[var(--umbil-brand-teal)] text-sm font-medium mb-4">
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <div className="flex justify-between items-start">
            <div>
               <h1 className="text-2xl font-bold text-[var(--umbil-text)]">{survey.title}</h1>
               <div className="flex items-center gap-2 mt-2">
                 <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${analytics?.stats.thresholdMet ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {analytics?.stats.thresholdMet ? 'Ready for Appraisal' : 'Collecting Responses'}
                 </span>
                 <span className="text-sm text-[var(--umbil-muted)]">• Created {new Date(survey.created_at).toLocaleDateString()}</span>
               </div>
            </div>
            {/* Quick Actions */}
             <div className="flex gap-2">
                <button onClick={copyLink} className="btn btn--outline flex items-center gap-2 text-sm">
                   {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Copied' : 'Copy Link'}
                </button>
             </div>
          </div>
        </div>

        {/* Tabs Header */}
        <div className="flex border-b border-[var(--umbil-divider)] mb-8 overflow-x-auto">
           <TabButton id="preview" label="Preview" icon={<Eye size={16}/>} active={activeTab} set={setActiveTab} />
           <TabButton id="share" label="Share" icon={<Share2 size={16}/>} active={activeTab} set={setActiveTab} />
           <TabButton id="results" label="Results" icon={<BarChart3 size={16}/>} active={activeTab} set={setActiveTab} locked={!analytics?.stats.thresholdMet} />
           <TabButton id="reflection" label="Reflection" icon={<FileText size={16}/>} active={activeTab} set={setActiveTab} locked={!analytics?.stats.thresholdMet} />
        </div>

        {/* --- TAB CONTENT --- */}
        
        {/* TAB 1: PREVIEW & CUSTOM QUESTIONS */}
        {activeTab === 'preview' && (
           <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left: Configuration */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6">
                        <h3 className="font-bold text-sm uppercase text-[var(--umbil-muted)] mb-4">Core Questions</h3>
                        <p className="text-sm text-[var(--umbil-text)] mb-2">
                            The 13 core questions are fixed to ensure GMC compliance and statistical validity.
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
                        
                        <div className="space-y-3 mb-4">
                            {customQuestions.map((q, i) => (
                                <div key={i} className="relative group">
                                    <input 
                                        type="text" 
                                        value={q}
                                        onChange={(e) => updateCustomQuestion(i, e.target.value)}
                                        onBlur={commitCustomQuestion}
                                        placeholder="e.g. How was the waiting room?"
                                        className="w-full p-3 pr-10 border border-gray-200 rounded-lg text-sm focus:border-teal-500 outline-none"
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
                                className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-teal-500 hover:text-teal-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={16}/> Add Question
                            </button>
                        )}
                        {savingQuestions && <p className="text-xs text-gray-400 mt-2 text-center">Saving...</p>}
                    </div>

                    <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary w-full flex items-center justify-center gap-2">
                        View Live Survey <ExternalLink size={14}/>
                    </a>
                </div>

                {/* Right: Preview */}
                <div className="md:col-span-2">
                    <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                        <div className="text-center pb-6 border-b border-gray-100 mb-6">
                            <h4 className="font-bold text-xl text-gray-900">{PSQ_INTRO.title}</h4>
                            <p className="text-sm text-gray-500 mt-2">{PSQ_INTRO.body}</p>
                        </div>
                        
                        <div className="space-y-6 opacity-75 hover:opacity-100 transition-opacity">
                            {PSQ_QUESTIONS.map((q, i) => (
                                <div key={q.id} className="flex gap-4">
                                    <span className="text-xs font-bold text-gray-300 mt-1 w-6">{i+1}.</span>
                                    <div className="flex-1">
                                        <p className="font-medium text-gray-800 text-sm">{q.text}</p>
                                        {q.type === 'likert' && (
                                            <div className="flex gap-1 mt-2">
                                                {PSQ_SCALE.slice(0,5).map(s => (
                                                    <div key={s.value} className="h-2 flex-1 bg-gray-100 rounded-sm"></div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}

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
        )}

        {/* TAB 2: SHARE */}
        {activeTab === 'share' && (
           <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-2 space-y-6">
                  <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-8">
                     <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center">
                            <Share2 size={24}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Share via Link</h3>
                            <p className="text-sm text-[var(--umbil-muted)]">Use this for SMS or Email campaigns.</p>
                        </div>
                     </div>
                     <div className="w-full flex gap-2">
                        <input readOnly value={publicUrl} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-sm text-gray-600 outline-none font-mono" />
                        <button onClick={copyLink} className="btn btn--primary px-6">{copied ? 'Copied' : 'Copy'}</button>
                     </div>
                  </div>

                  <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-8 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <Tablet size={24}/>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Kiosk Mode</h3>
                            <p className="text-sm text-[var(--umbil-muted)]">Auto-refreshes for the next patient.</p>
                        </div>
                     </div>
                     <button className="btn btn--outline" onClick={openKioskMode}>Launch Kiosk</button>
                  </div>
              </div>

              {/* QR Code */}
              <div className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <QrCode size={18} /> Scan to Start
                  </h3>
                  <div className="bg-white p-2 border border-gray-100 rounded-lg shadow-inner mb-4">
                     {/* Using a reliable public API for QR generation to avoid dependency issues for the user */}
                     <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`} 
                        alt="QR Code" 
                        className="w-32 h-32"
                     />
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Print this and place it in your waiting room.</p>
                  <button onClick={() => window.print()} className="text-xs font-bold text-teal-600 hover:underline">Print QR Card</button>
              </div>

           </div>
        )}

        {/* TAB 3: RESULTS (LOCKED IF < 34) */}
        {activeTab === 'results' && (
           <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {!analytics?.stats.thresholdMet ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center max-w-2xl mx-auto">
                     <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={24}/>
                     </div>
                     <h3 className="text-xl font-bold text-amber-900 mb-2">Results Locked</h3>
                     <p className="text-amber-800 mb-6">
                        To protect anonymity and ensure statistical validity, results are hidden until you receive <strong>34 responses</strong>.
                     </p>
                     <div className="bg-white rounded-full h-4 w-64 mx-auto overflow-hidden border border-amber-200 mb-2">
                        <div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: `${(analytics?.stats.totalResponses || 0)/34 * 100}%` }}/>
                     </div>
                     <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                        {analytics?.stats.totalResponses} / 34 Responses
                     </p>
                  </div>
              ) : (
                  <div className="space-y-6">
                     {/* Stats Row */}
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard label="Total Responses" value={analytics.stats.totalResponses} />
                        <StatCard label="Average Score" value={analytics.stats.averageScore} sub="/ 5.0" />
                        <StatCard label="Top Domain" value={analytics.stats.topArea} isText />
                     </div>
                     
                     {/* Domain Breakdown */}
                     <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg">GMC Domain Breakdown</h3>
                            <button onClick={handlePrintReport} className="btn btn--outline text-xs flex items-center gap-2">
                                <Download size={14}/> Download PDF Report
                            </button>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.breakdown} layout="vertical" margin={{ left: 100, right: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--umbil-card-border)" />
                                    <XAxis type="number" domain={[0, 5]} hide />
                                    <YAxis type="category" dataKey="name" width={140} axisLine={false} tickLine={false} tick={{fill: 'var(--umbil-text)', fontSize: 10}} />
                                    <Tooltip cursor={{fill: 'var(--umbil-hover-bg)'}} />
                                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24} fill="var(--umbil-brand-teal)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                     </div>

                     {/* Free Text (Protected & Toggable) */}
                     <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <FileText size={20}/> Patient Comments
                            </h3>
                            <button 
                                onClick={() => setShowComments(!showComments)} 
                                className="text-xs font-bold uppercase text-[var(--umbil-brand-teal)] border border-[var(--umbil-brand-teal)] px-3 py-1 rounded hover:bg-[var(--umbil-hover-bg)] transition-colors"
                            >
                                {showComments ? 'Hide Comments' : 'Show Comments'}
                            </button>
                        </div>

                        {showComments ? (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                {analytics.textFeedback.length === 0 ? (
                                    <p className="text-gray-500 italic">No text comments provided yet.</p>
                                ) : (
                                    analytics.textFeedback.map((fb, i) => (
                                        <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="text-xs text-gray-400 mb-2">{fb.date}</div>
                                            {fb.good && <p className="text-sm text-gray-800 mb-2"><strong className="text-emerald-600">Good:</strong> {fb.good}</p>}
                                            {fb.improve && <p className="text-sm text-gray-800"><strong className="text-amber-600">Improve:</strong> {fb.improve}</p>}
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200 text-gray-400 text-sm">
                                <FileText size={24} className="mx-auto mb-2 opacity-50"/>
                                Comments hidden for presentation safety.
                            </div>
                        )}
                     </div>
                  </div>
              )}
           </div>
        )}

        {/* TAB 4: REFLECTION */}
        {activeTab === 'reflection' && (
           <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {!analytics?.stats.thresholdMet ? (
                     <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <Lock size={32} className="mb-4 opacity-50"/>
                        <p>Reflection tools unlock once you have 34 responses.</p>
                     </div>
                ) : (
                    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-1">
                        <div className="bg-[var(--umbil-hover-bg)]/50 p-6 border-b border-[var(--umbil-card-border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[var(--umbil-brand-teal)] text-white rounded-[var(--umbil-radius-sm)]">
                                    <Sparkles size={18} fill="currentColor" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Appraisal Reflection</h3>
                                    <p className="text-sm text-[var(--umbil-muted)]">Generate a structured reflection for your portfolio.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleGenerateReflection}
                                    disabled={isGenerating}
                                    className="btn btn--outline text-sm bg-white"
                                >
                                    {isGenerating ? 'Writing...' : 'Auto-Draft'}
                                </button>
                                <button 
                                    onClick={handleSaveToLog}
                                    disabled={!reflection || isSavingLog}
                                    className="btn btn--primary text-sm shadow-md shadow-teal-500/20 flex items-center gap-2"
                                >
                                    {isSavingLog ? 'Saving...' : <><Save size={14}/> Save to Log</>}
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 relative">
                            <textarea 
                                value={reflection}
                                onChange={(e) => setReflection(e.target.value)}
                                placeholder="Click 'Auto-Draft' to generate insights..."
                                className="w-full min-h-[400px] bg-transparent border-none outline-none resize-none text-[var(--umbil-text)] placeholder:text-[var(--umbil-muted)]/50 leading-relaxed p-4"
                            />
                        </div>
                        <div className="px-6 pb-6 text-xs text-gray-400 text-right">
                           {PSQ_FOOTER_TEXT}
                        </div>
                    </div>
                )}
           </div>
        )}

      </div>
    </section>
  );
}

function TabButton({ id, label, icon, active, set, locked = false }: any) {
    return (
        <button 
            onClick={() => !locked && set(id)}
            className={`
                flex items-center gap-2 px-6 py-4 border-b-2 transition-all whitespace-nowrap
                ${active === id 
                    ? 'border-[var(--umbil-brand-teal)] text-[var(--umbil-brand-teal)] font-bold' 
                    : 'border-transparent text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] font-medium'}
                ${locked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            {icon} {label} {locked && <Lock size={12} className="ml-1"/>}
        </button>
    )
}

function StatCard({ label, value, sub, isText }: any) {
    return (
        <div className="bg-[var(--umbil-surface)] p-6 rounded-xl border border-[var(--umbil-card-border)] shadow-sm">
            <h4 className="text-xs font-bold uppercase text-[var(--umbil-muted)] mb-2">{label}</h4>
            <div className={`font-bold text-[var(--umbil-text)] ${isText ? 'text-lg leading-tight' : 'text-3xl'}`}>
                {value}
            </div>
            {sub && <div className="text-xs text-[var(--umbil-muted)] mt-1">{sub}</div>}
        </div>
    )
}