// src/app/msf/components/MsfShareGatherTab.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Copy, Mail, Plus, Trash2, CheckCircle2, Lock, Check, ExternalLink, Send } from 'lucide-react';
import { MSF_QUESTIONS } from '@/lib/msf-questions';
import { MsfAnalyticsResult } from '@/lib/msf-analytics';

interface MsfShareGatherTabProps {
    cycle: any;
    analytics: MsfAnalyticsResult;
    onRefresh: () => void;
}

export default function MsfShareGatherTab({ cycle, analytics, onRefresh }: MsfShareGatherTabProps) {
    const [copiedLink, setCopiedLink] = useState(false);
    const [customQuestions, setCustomQuestions] = useState<string[]>(cycle.custom_questions || []);
    const [savingQuestions, setSavingQuestions] = useState(false);
    
    // New state for server-side email dispatch
    const [inviteEmail, setInviteEmail] = useState('');
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const responses = analytics.stats.totalResponses;
    const required = analytics.stats.targetThreshold;
    const isThresholdMet = analytics.stats.thresholdMet;
    const isClosed = cycle.status === 'closed' || isThresholdMet;
    const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/m/${cycle.id}`;

    const saveCustomQuestions = async (updated: string[]) => {
        setSavingQuestions(true);
        setCustomQuestions(updated);
        await supabase.from('msf_cycles').update({ custom_questions: updated }).eq('id', cycle.id);
        setSavingQuestions(false);
        onRefresh();
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

    const sendEmailInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail) return;

        setIsSendingInvite(true);
        setInviteStatus('idle');

        try {
            const response = await fetch('/api/msf/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: inviteEmail,
                    link: publicUrl,
                    title: cycle.title || 'Appraisal Feedback'
                }),
            });

            if (!response.ok) throw new Error('Failed to send');
            
            setInviteStatus('success');
            setInviteEmail('');
            setTimeout(() => setInviteStatus('idle'), 3000);
        } catch (error) {
            console.error(error);
            setInviteStatus('error');
        } finally {
            setIsSendingInvite(false);
        }
    };

    return (
        <div className="animate-in fade-in duration-300 space-y-12">
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
                                    style={copiedLink ? { borderColor: 'var(--umbil-brand-teal)', color: 'var(--umbil-brand-teal)', backgroundColor: 'rgba(31, 184, 205, 0.05)'} : {}}
                                >
                                    {copiedLink ? <Check size={18}/> : <Copy size={18} />} {copiedLink ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        </div>
                        <div className="border-t border-[var(--umbil-divider)] pt-6">
                            <h3 className="font-bold text-[var(--umbil-text)] mb-3">Direct Email Invite</h3>
                            <p className="text-[var(--umbil-muted)] text-sm mb-4">Send a professional, clickable invitation directly to a colleague's inbox.</p>
                            <form onSubmit={sendEmailInvite} className="flex flex-col gap-3">
                                <div className="flex gap-2">
                                    <input 
                                        type="email" 
                                        required 
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="colleague@nhs.net" 
                                        className="flex-1 px-4 py-2.5 bg-[var(--umbil-bg)] border border-[var(--umbil-divider)] rounded-xl text-[var(--umbil-text)] outline-none text-sm focus:border-[var(--umbil-brand-teal)] transition-colors"
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={isSendingInvite} 
                                        className="btn btn--primary flex items-center gap-2 whitespace-nowrap"
                                    >
                                        {isSendingInvite ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <><Send size={16} /> Send</>}
                                    </button>
                                </div>
                                {inviteStatus === 'success' && <p className="text-sm font-medium text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14} /> Invitation sent successfully</p>}
                                {inviteStatus === 'error' && <p className="text-sm font-medium text-red-600">Failed to send invitation. Please check your connection.</p>}
                            </form>
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
                                <div className="bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] p-4 rounded-xl flex items-start gap-3 mt-4">
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

            <div className="border-t border-[var(--umbil-divider)] pt-12">
                <h2 className="text-xl font-bold mb-6 text-[var(--umbil-text)]">Survey Preview & Configuration</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6">
                            <h3 className="font-bold text-sm uppercase text-[var(--umbil-muted)] mb-4">Core Questions</h3>
                            <p className="text-sm text-[var(--umbil-text)] mb-2">The core questions are fixed to ensure GMC compliance.</p>
                            <div className="flex items-center gap-2 text-xs text-[var(--umbil-brand-teal)] font-bold bg-[var(--umbil-brand-teal)]/10 p-2 rounded">
                                <Lock size={12}/> Standardised Set Active
                            </div>
                        </div>

                        <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6">
                            <h3 className="font-bold text-sm uppercase text-[var(--umbil-muted)] mb-4">Custom Questions</h3>
                            <p className="text-sm text-[var(--umbil-text)] mb-4">Add up to 2 optional questions specific to your practice.</p>
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
                                                    className="w-full p-3 pr-10 border border-[var(--umbil-divider)] rounded-xl text-sm focus:border-[var(--umbil-brand-teal)] outline-none bg-[var(--umbil-bg)] text-[var(--umbil-text)]"
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
                                            className="w-full py-2 border border-dashed border-[var(--umbil-divider)] rounded-lg text-sm text-[var(--umbil-muted)] hover:border-[var(--umbil-brand-teal)] hover:text-[var(--umbil-brand-teal)] transition-colors flex items-center justify-center gap-2"
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

                    <div className="md:col-span-2">
                        <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-8 shadow-sm">
                             <div className="text-center pb-6 border-b border-[var(--umbil-divider)] mb-6">
                                <h4 className="font-bold text-xl text-[var(--umbil-text)]">{cycle.title || 'MSF Cycle'}</h4>
                                <p className="text-sm text-[var(--umbil-muted)] mt-2">I would be grateful if you could provide some 360-degree feedback for my upcoming appraisal.</p>
                            </div>
                            
                            <div className="space-y-4 opacity-75 hover:opacity-100 transition-opacity">
                                <h5 className="font-bold text-sm text-[var(--umbil-text)]">Ratings (1-5 Scale)</h5>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--umbil-muted)] mb-6">
                                    {MSF_QUESTIONS.map((q) => (
                                        <li key={q.id}>{q.text}</li>
                                    ))}
                                </ul>

                                <h5 className="font-bold text-sm text-[var(--umbil-text)] pt-4 border-t border-[var(--umbil-divider)]">Free Text</h5>
                                <ul className="list-disc pl-5 space-y-2 text-sm text-[var(--umbil-muted)]">
                                    <li>What are this doctor’s greatest strengths?</li>
                                    <li>Please provide an example of something this doctor does particularly well.</li>
                                    <li>Are there any areas where this doctor could further develop or improve?</li>
                                    <li>Any additional comments?</li>
                                </ul>

                                {customQuestions.length > 0 && (
                                    <div className="border-t border-dashed border-[var(--umbil-divider)] pt-6 mt-6">
                                        <p className="text-xs font-bold uppercase text-[var(--umbil-brand-teal)] mb-4">Your Custom Questions</p>
                                        {customQuestions.map((q, i) => (
                                            <div key={`c-${i}`} className="flex gap-4 mb-4">
                                                <span className="text-xs font-bold text-[var(--umbil-muted)] mt-1 w-6">+</span>
                                                <div>
                                                    <p className="font-medium text-[var(--umbil-text)] text-sm">{q || "New question..."}</p>
                                                    <span className="text-[10px] bg-[var(--umbil-hover-bg)] text-[var(--umbil-muted)] px-1.5 py-0.5 rounded">Optional</span>
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
