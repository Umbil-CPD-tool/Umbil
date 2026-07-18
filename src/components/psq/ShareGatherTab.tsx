'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Copy, ExternalLink, Lock, CheckCircle2, Tablet, Plus, Trash2, QrCode, Check } from 'lucide-react';
import { PSQ_QUESTIONS, PSQ_SCALE, PSQ_INTRO } from '@/lib/psq-questions';

export default function ShareGatherTab({ id, survey, responses, required, isThresholdMet }: any) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<string[]>(survey.custom_questions || []);
  const [savingQuestions, setSavingQuestions] = useState(false);

  const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${id}`;

  const saveCustomQuestions = async (updated: string[]) => {
    setSavingQuestions(true);
    setCustomQuestions(updated);
    await supabase.from('psq_surveys').update({ custom_questions: updated }).eq('id', id);
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

  const commitCustomQuestion = () => saveCustomQuestions(customQuestions);

  const removeCustomQuestion = (idx: number) => {
    const updated = customQuestions.filter((_, i) => i !== idx);
    saveCustomQuestions(updated);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openKioskMode = () => window.open(`/s/${id}?kiosk=true`, '_blank');

  const printQR = () => {
      const url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}`;
      const win = window.open('', '_blank');
      win?.document.write(`
          <html>
          <head><title>Print QR Code</title></head>
          <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;text-align:center;">
              <h2 style="color:#0d9488;margin-bottom:20px;font-size:24px;">Scan for Patient Feedback</h2>
              <img src="${url}" style="width:300px;height:300px;" />
              <p style="margin-top:20px;color:#6b7280;">Open the camera on your phone and point it at this code.</p>
              <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
          </body>
          </html>
      `);
      win?.document.close();
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-12">
        <div>
            <h2 className="text-xl font-bold mb-6 text-[var(--umbil-text)]">Share Survey</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-8">
                    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div>
                        <h3 className="font-bold text-lg">Share via Link</h3>
                        <p className="text-sm text-[var(--umbil-muted)] mb-6">Use this for SMS or Email campaigns.</p>
                        </div>
                        <div className="w-full flex gap-2">
                        <input readOnly value={publicUrl} className="flex-1 bg-gray-50 dark:bg-zinc-900 border border-[var(--umbil-divider)] rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 outline-none font-mono" />
                        <button 
                            onClick={copyLink}
                            className="btn btn--outline flex items-center gap-2"
                            style={copiedLink ? { borderColor: 'var(--umbil-brand-teal)', color: 'var(--umbil-brand-teal)', backgroundColor: 'rgba(31, 184, 205, 0.05)'} : {}}
                        >
                            {copiedLink ? <Check size={18}/> : <Copy size={18} />} {copiedLink ? 'Copied' : 'Copy'}
                        </button>
                        </div>
                    </div>

                    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 shadow-sm flex items-center justify-between">
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

                {/* Right Column */}
                <div className="space-y-8">
                    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
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
                                    <p className="text-sm mt-1">You have enough responses to safely view the aggregated data.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-amber-50 text-amber-700 p-4 rounded-xl flex items-start gap-3 mt-4">
                                <Lock className="shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold">Results are Locked</p>
                                    <p className="text-sm mt-1">Results cannot be viewed until {required} responses are reached.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-sm">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><QrCode size={18} /> Scan to Start</h3>
                        <div className="bg-white p-2 border border-gray-100 rounded-lg shadow-inner mb-4">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(publicUrl)}`} alt="QR Code" className="w-32 h-32" />
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Print this and place it in your waiting room.</p>
                        <button onClick={printQR} className="text-xs font-bold text-[var(--umbil-brand-teal)] hover:underline">Print QR Card</button>
                    </div>
                </div>
            </div>
        </div>

        <div className="border-t border-[var(--umbil-divider)] pt-12">
            <h2 className="text-xl font-bold mb-6 text-[var(--umbil-text)]">Survey Preview & Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
                <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6">
                    <h3 className="font-bold text-sm uppercase text-[var(--umbil-muted)] mb-4">Core Questions</h3>
                    <p className="text-sm text-[var(--umbil-text)] mb-2">The 13 core questions are fixed to ensure GMC compliance.</p>
                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold bg-emerald-50 p-2 rounded">
                        <Lock size={12}/> Standardised Set Active
                    </div>
                </div>

                <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6">
                    <h3 className="font-bold text-sm uppercase text-[var(--umbil-muted)] mb-4">Custom Questions</h3>
                    <div className="space-y-3 mb-4">
                        {customQuestions.map((q, i) => (
                            <div key={i} className="relative group">
                                <input 
                                    type="text" 
                                    value={q}
                                    onChange={(e) => updateCustomQuestion(i, e.target.value)}
                                    onBlur={commitCustomQuestion}
                                    placeholder="e.g. How was the waiting room?"
                                    className="w-full p-3 pr-10 border border-[var(--umbil-divider)] bg-[var(--umbil-bg)] text-[var(--umbil-text)] rounded-xl outline-none"
                                />
                                <button onClick={() => removeCustomQuestion(i)} className="absolute right-2 top-2.5 text-gray-400 hover:text-red-500">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ))}
                    </div>

                    {customQuestions.length < 2 && (
                        <button onClick={addCustomQuestion} className="w-full py-2 border border-dashed border-[var(--umbil-divider)] rounded-lg text-sm text-[var(--umbil-muted)] hover:text-[var(--umbil-brand-teal)] flex items-center justify-center gap-2">
                            <Plus size={16}/> Add Question
                        </button>
                    )}
                    {savingQuestions && <p className="text-xs text-[var(--umbil-muted)] mt-2 text-center">Saving...</p>}
                </div>

                <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn--primary w-full flex items-center justify-center gap-2">
                    View Live Survey <ExternalLink size={14}/>
                </a>
            </div>

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
                                            {PSQ_SCALE.slice(0,5).map(s => <div key={s.value} className="h-2 flex-1 bg-gray-100 rounded-sm"></div>)}
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
  );
}