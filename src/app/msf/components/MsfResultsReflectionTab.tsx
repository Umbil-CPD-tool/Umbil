'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Copy, Lock, Sparkles, FileText, Check, Printer, TrendingUp, Award, Activity, MessageSquareQuote, Info, PieChart as PieChartIcon, Save } from 'lucide-react';
import { MsfAnalyticsResult } from '@/lib/msf-analytics';
import { addCPD } from '@/lib/store';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
  PieChart, Pie, Legend
} from 'recharts';

const PIE_COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

interface MsfResultsReflectionTabProps {
    cycle: any;
    analytics: MsfAnalyticsResult;
}

export default function MsfResultsReflectionTab({ cycle, analytics }: MsfResultsReflectionTabProps) {
    const [copiedReflection, setCopiedReflection] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [reflection, setReflection] = useState(cycle.ai_summary || '');
    const [generatingAi, setGeneratingAi] = useState(false);
    const [isSavingLog, setIsSavingLog] = useState(false);

    const responses = analytics.stats.totalResponses;
    const required = analytics.stats.targetThreshold;
    const isThresholdMet = analytics.stats.thresholdMet;
    const isClosed = cycle.status === 'closed' || isThresholdMet;

    const strengthsComments = analytics.textFeedback.filter((fb: any) => fb.strengths);
    const exampleComments = analytics.textFeedback.filter((fb: any) => fb.example);
    const improveComments = analytics.textFeedback.filter((fb: any) => fb.improve);
    const additionalComments = analytics.textFeedback.filter((fb: any) => fb.additional);

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
            const { data: { session } } = await supabase.auth.getSession();
            
            const averages = {
                domain1: analytics.breakdown.find(b => b.id === 'Domain 1: Knowledge, Skills and Performance')?.score || 0,
                domain2: analytics.breakdown.find(b => b.id === 'Domain 2: Safety and Quality')?.score || 0,
                domain3: analytics.breakdown.find(b => b.id === 'Domain 3: Communication, Partnership and Teamwork')?.score || 0,
                domain4: analytics.breakdown.find(b => b.id === 'Domain 4: Maintaining Trust')?.score || 0,
            };

            const res = await fetch('/api/public/msf/ai-summary', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}` 
                },
                body: JSON.stringify({ cycle_id: cycle.id, averages, stats: analytics.stats }), 
            });
            
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Server responded with an error");
            if (data.summary) setReflection(data.summary);

        } catch (err: any) {
            alert(`Error generating summary: ${err.message}`); 
        } finally {
            setGeneratingAi(false);
        }
    };

    const handleSaveToLog = async () => {
        if (!reflection) return;
        setIsSavingLog(true);

        const { error } = await addCPD({
            timestamp: new Date().toISOString(),
            question: `Multi-Source Feedback (MSF) Review - ${cycle.title}`,
            answer: `Reviewed feedback from ${responses} colleagues. Overall score: ${analytics.stats.averageScore}/5.0.`,
            reflection: reflection,
            tags: ['MSF', 'Colleague Feedback', 'Appraisal', 'Domain 3', 'Domain 4'],
            duration: 30 
        });

        if (error) {
            if (error.message === "LIMIT_REACHED") {
                alert("You have reached your monthly CPD logging limit. Please upgrade to Pro.");
            } else {
                alert("Could not save to Capture learning. Please try again.");
            }
        } else {
            alert("Saved to Capture learning successfully!");
        }
        
        setIsSavingLog(false);
    };

    const copyReflection = () => {
        navigator.clipboard.writeText(reflection);
        setCopiedReflection(true);
        setTimeout(() => setCopiedReflection(false), 2000);
    };

    const printReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Please allow popups to print your report.");
            return;
        }

        const dateStr = new Date(cycle.created_at).toISOString().split('T')[0];
        const docTitle = `MSF_Report_${dateStr}`;

        const scoresRows = analytics.breakdown.map((q: any) => {
            const scoreDisplay = typeof q.score === 'number' ? q.score.toFixed(2) : q.score;
            return `<tr><td style="font-weight: 500;">${q.name}</td><td style="text-align: right; font-weight: 700; color: #1fb8cd;">${scoreDisplay}</td></tr>`;
        }).join('');

        const roleRows = analytics.roleTypes && analytics.roleTypes.length > 0 
            ? analytics.roleTypes.map((t: any) => `<tr><td style="font-weight: 500;">${t.name}</td><td style="text-align: right; font-weight: 700; color: #64748b;">${t.value}</td></tr>`).join('')
            : `<tr><td colspan="2" style="color: #94a3b8; font-style: italic; text-align: center;">No data recorded</td></tr>`;

        const strengthsHtml = strengthsComments.map((fb: any) => `<div class="feedback-card good">"${fb.strengths}"</div>`).join('');
        const exampleHtml = exampleComments.map((fb: any) => `<div class="feedback-card good">"${fb.example}"</div>`).join('');
        const improveHtml = improveComments.map((fb: any) => `<div class="feedback-card improve">"${fb.improve}"</div>`).join('');
        const additionalHtml = additionalComments.map((fb: any) => `<div class="feedback-card">"${fb.additional}"</div>`).join('');
        
        let commentsHtml = '';
        if (strengthsHtml || exampleHtml || improveHtml || additionalHtml) {
            commentsHtml = `<div class="feedback-container">`;
            if (strengthsHtml || exampleHtml) {
                commentsHtml += `<div class="feedback-column">`;
                if (strengthsHtml) commentsHtml += `<div class="feedback-header good">Greatest Strengths</div>${strengthsHtml}`;
                if (exampleHtml) commentsHtml += `<div class="feedback-header good" style="margin-top:20px;">Examples</div>${exampleHtml}`;
                commentsHtml += `</div>`;
            }
            if (improveHtml || additionalHtml) {
                commentsHtml += `<div class="feedback-column">`;
                if (improveHtml) commentsHtml += `<div class="feedback-header improve">Areas for Development</div>${improveHtml}`;
                if (additionalHtml) commentsHtml += `<div class="feedback-header" style="margin-top:20px; color:#475569;">Additional Comments</div>${additionalHtml}`;
                commentsHtml += `</div>`;
            }
            commentsHtml += `</div>`;
        } else {
            commentsHtml = '<p style="color: #64748b; font-style: italic;">No written comments available.</p>';
        }

        const customFeedbackHtml = analytics.customFeedback.map((cf: any) => `
            <div class="comment-section">
                <h4 style="color: #475569; margin-bottom: 5px;">Q: ${cf.question}</h4>
                <ul style="margin-top: 0; padding-left: 20px; color: #334155;">
                    ${cf.answers.map((ans: string) => `<li>"${ans}"</li>`).join('')}
                </ul>
            </div>
        `).join('');

        const reflectionHtml = reflection ? `<div class="reflection-box"><h3>💡 Reflection & Action Plan</h3><div class="markdown-body">${reflection.replace(/\n/g, '<br/>')}</div></div>` : `<div class="no-print" style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 15px; text-align: center; font-style: italic; color: #64748b; margin-bottom: 30px; border-radius: 8px;">Tip: Please wait for your AI reflection to finish generating before printing to include it in your portfolio.</div>`;

        const htmlContent = `
        <html>
            <head>
            <title>${docTitle}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                @media print { 
                    @page { margin: 1.5cm; size: auto; } 
                    body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
                    .dashboard, .reflection-box, .feedback-container, .data-tables { break-inside: avoid; }
                    .feedback-card { break-inside: avoid; }
                    .no-print { display: none !important; }
                }
                tr:nth-child(even) { background-color: #f8fafc; }
                body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 900px; margin: 0 auto; line-height: 1.5; }
                .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: end; }
                h1 { color: #0f172a; margin: 0; font-size: 24px; }
                .subtitle { color: #64748b; font-size: 14px; margin-top: 5px; }
                .dashboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; background: #f0fdfa; padding: 20px; border-radius: 12px; border: 1px solid #ccfbf1; }
                .stat-box { text-align: center; }
                .stat-val { display: block; font-size: 24px; font-weight: 800; color: #1fb8cd; }
                .stat-label { font-size: 11px; color: #115e59; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; margin-top: 4px; }
                .data-tables { display: flex; gap: 30px; margin-bottom: 30px; align-items: flex-start; }
                .data-table-wrapper { flex: 1; }
                .data-table-wrapper.large { flex: 2; }
                table { width: 100%; border-collapse: collapse; font-size: 14px; }
                th { text-align: left; border-bottom: 2px solid #cbd5e1; padding: 10px; color: #64748b; text-transform: uppercase; font-size: 12px; }
                td { border-bottom: 1px solid #e2e8f0; padding: 12px 10px; color: #334155; }
                tr:last-child td { border-bottom: none; }
                .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 15px; border-left: 4px solid #1fb8cd; padding-left: 10px; }
                .feedback-container { display: flex; gap: 30px; margin-bottom: 20px; align-items: flex-start; }
                .feedback-column { flex: 1; }
                .feedback-header { font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em; }
                .feedback-header.good { color: #059669; }
                .feedback-header.improve { color: #d97706; }
                .feedback-card { padding: 12px 16px; margin-bottom: 12px; border-radius: 6px; font-size: 13px; font-style: italic; color: #334155; line-height: 1.5; background-color: #f1f5f9; border-left: 3px solid #cbd5e1; }
                .feedback-card.good { background-color: #ecfdf5; border-left-color: #10b981; }
                .feedback-card.improve { background-color: #fffbeb; border-left-color: #f59e0b; }
                .comment-section { margin-bottom: 20px; }
                .reflection-box { background: #fff7ed; border: 1px solid #fed7aa; padding: 25px; border-radius: 8px; margin-bottom: 30px; }
                .markdown-body { font-size: 14px; color: #431407; white-space: pre-wrap; }
            </style>
            </head>
            <body>
            <div class="header">
                <div><h1>${cycle.title || 'MSF Cycle'}</h1><div class="subtitle">Multi-Source Feedback Report • Generated by Umbil</div></div>
            </div>
            <div class="dashboard">
                <div class="stat-box"><span class="stat-val">${analytics.stats.totalResponses}</span><span class="stat-label">Total Responses</span></div>
                <div class="stat-box"><span class="stat-val">${analytics.stats.averageScore}</span><span class="stat-label">Average Score (Max 5)</span></div>
                <div class="stat-box"><span class="stat-val" style="font-size: 18px; line-height: 1.4;">${analytics.stats.topArea}</span><span class="stat-label">Highest Rated Area</span></div>
            </div>
            <div class="data-tables">
                <div class="data-table-wrapper large">
                    <div class="section-title">Score Breakdown</div>
                    <table><thead><tr><th>Question Area</th><th style="text-align: right;">Average Score</th></tr></thead><tbody>${scoresRows}</tbody></table>
                </div>
                <div class="data-table-wrapper">
                    <div class="section-title">Respondent Roles</div>
                    <table><thead><tr><th>Role</th><th style="text-align: right;">Count</th></tr></thead><tbody>${roleRows}</tbody></table>
                </div>
            </div>
            ${reflectionHtml}
            <div class="section-title" style="page-break-before: always;">Thematic Colleague Comments</div>
            ${commentsHtml}
            ${customFeedbackHtml ? `
                <div class="section-title" style="page-break-before: auto; margin-top: 30px;">Custom Questions</div>
                ${customFeedbackHtml}
            ` : ''}
            <script>
                document.title = "${docTitle}";
                try { history.replaceState(null, null, "${docTitle}"); } catch(e) {}
                window.onload = function() { setTimeout(() => window.print(), 500); };
            </script>
            </body>
        </html>
        `;
        
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.title = docTitle;
        printWindow.document.close();
    };

    function StatCard({ label, value, sub, icon, isText = false }: any) {
        return (
            <div className="bg-[var(--umbil-surface)] p-5 rounded-[var(--umbil-radius-lg)] shadow-[var(--umbil-shadow-sm)] border border-[var(--umbil-card-border)] flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-[var(--umbil-muted)] uppercase tracking-wider">{label}</h3>
                    <div className="text-[var(--umbil-brand-teal)] opacity-80">{icon}</div>
                </div>
                <div>
                    <span className={`font-extrabold text-[var(--umbil-text)] ${isText ? 'text-xl line-clamp-1' : 'text-3xl'}`} title={isText ? value : ''}>
                        {value}
                    </span>
                    {sub && <div className="text-xs font-medium text-[var(--umbil-muted)] mt-1">{sub}</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-300">
            {!isClosed ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center max-w-2xl mx-auto mt-8">
                    <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={24}/>
                    </div>
                    <h3 className="text-xl font-bold text-amber-900 mb-2">Results Locked</h3>
                    <p className="text-amber-800 mb-6">
                        To protect anonymity and ensure statistical validity, results are hidden until you close the cycle.
                    </p>
                </div>
            ) : !cycle.has_paid ? (
                <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm mt-8">
                    <div className="w-16 h-16 bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-[var(--umbil-text)]">Unlock Your Colleague Feedback Report</h3>
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
                <div className="space-y-8 mt-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-end mb-2">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--umbil-text)]">Final Report & Analytics</h2>
                            <p className="text-[var(--umbil-muted)] mt-1">Detailed feedback analysis for this MSF cycle.</p>
                        </div>
                        <button onClick={printReport} className="btn btn--outline flex items-center gap-2">
                            <Printer size={16} /> Export PDF
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard label="Total Responses" value={analytics.stats.totalResponses} sub="Colleagues" icon={<Activity size={20} />} />
                        <StatCard label="Overall Score" value={analytics.stats.averageScore} sub="/ 5.0" icon={<TrendingUp size={20} />} />
                        <StatCard label="Key Strength" value={analytics.stats.topArea} sub="Highest Domain" icon={<Award size={20} />} isText />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6 shadow-sm flex flex-col">
                            <div className="mb-4">
                                <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)]">
                                    <FileText size={18} className="text-[var(--umbil-brand-teal)]" /> 
                                    Breakdown by Domain
                                </h3>
                                <p className="text-xs text-[var(--umbil-muted)] mt-1 flex items-center gap-1">
                                    <Info size={12}/> The dotted line indicates the standard GMC target score (4.0).
                                </p>
                            </div>
                            
                            <div className="h-72 w-full text-xs flex-grow">
                                {analytics.breakdown.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.breakdown} layout="vertical" margin={{ top: 20, left: 100, right: 30, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--umbil-card-border)" />
                                            <XAxis type="number" domain={[0, 5]} hide />
                                            <YAxis type="category" dataKey="name" width={110} axisLine={false} tickLine={false} tick={{fill: 'var(--umbil-text)', fontWeight: 500}} />
                                            <Tooltip cursor={{fill: 'var(--umbil-hover-bg)'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'var(--umbil-surface)' }} />
                                            
                                            <ReferenceLine x={4.0} stroke="var(--umbil-muted)" strokeDasharray="3 3" label={{ position: 'top', value: 'GMC Target (4.0)', fill: 'var(--umbil-muted)', fontSize: 10, fontWeight: 600 }} />
                                            
                                            <Bar dataKey="score" radius={4} barSize={20} background={{ fill: 'var(--umbil-hover-bg)', radius: 4 }}>
                                                {analytics.breakdown.map((entry: any, index: number) => (
                                                    <Cell 
                                                        key={`cell-${index}`} 
                                                        fill={typeof entry.score === 'number' && entry.score < 4.0 ? '#d97706' : 'var(--umbil-brand-teal)'} 
                                                    />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <div className="flex h-full items-center justify-center text-[var(--umbil-muted)]">No data available yet</div>}
                            </div>
                        </div>

                        <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6 shadow-sm flex flex-col">
                            <div className="mb-4">
                                <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)]">
                                    <PieChartIcon size={18} className="text-[var(--umbil-brand-teal)]" /> 
                                    Respondent Roles
                                </h3>
                                <p className="text-xs text-[var(--umbil-muted)] mt-1">Breakdown of colleague professions.</p>
                            </div>
                            
                            <div className="h-72 w-full text-xs flex justify-center items-center flex-grow">
                                {analytics.roleTypes && analytics.roleTypes.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.roleTypes}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {analytics.roleTypes.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="text-[var(--umbil-muted)] text-center px-4">
                                        <p className="mb-1">No role data recorded.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {(strengthsComments.length > 0 || exampleComments.length > 0 || improveComments.length > 0 || additionalComments.length > 0) && (
                        <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl overflow-hidden shadow-sm">
                            <div className="p-5 border-b border-[var(--umbil-card-border)] bg-[var(--umbil-bg)]/50">
                                <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)]">
                                    <MessageSquareQuote size={18} className="text-[var(--umbil-brand-teal)]" /> 
                                    Colleague Comments
                                </h3>
                                <p className="text-xs text-[var(--umbil-muted)] mt-1">Displayed randomly to protect anonymity.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--umbil-divider)]">
                                <div className="p-6 space-y-8">
                                    <div>
                                        <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-4">Greatest Strengths</h4>
                                        {strengthsComments.length > 0 ? (
                                            <ul className="space-y-4">
                                                {strengthsComments.map((fb: any, idx: number) => (
                                                    <li key={idx} className="text-sm text-[var(--umbil-text)] leading-relaxed bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                                                        "{fb.strengths}"
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-sm text-gray-400 italic">No comments in this category.</p>}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-4">Examples Provided</h4>
                                        {exampleComments.length > 0 ? (
                                            <ul className="space-y-4">
                                                {exampleComments.map((fb: any, idx: number) => (
                                                    <li key={idx} className="text-sm text-[var(--umbil-text)] leading-relaxed bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                                                        "{fb.example}"
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-sm text-gray-400 italic">No comments in this category.</p>}
                                    </div>
                                </div>

                                <div className="p-6 space-y-8">
                                    <div>
                                        <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-4">Areas for Development</h4>
                                        {improveComments.length > 0 ? (
                                            <ul className="space-y-4">
                                                {improveComments.map((fb: any, idx: number) => (
                                                    <li key={idx} className="text-sm text-[var(--umbil-text)] leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                                                        "{fb.improve}"
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-sm text-gray-400 italic">No comments in this category.</p>}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--umbil-muted)] uppercase tracking-wide mb-4">Additional Comments</h4>
                                        {additionalComments.length > 0 ? (
                                            <ul className="space-y-4">
                                                {additionalComments.map((fb: any, idx: number) => (
                                                    <li key={idx} className="text-sm text-[var(--umbil-text)] leading-relaxed bg-[var(--umbil-bg)] p-3 rounded-lg border border-[var(--umbil-divider)]">
                                                        "{fb.additional}"
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-sm text-gray-400 italic">No comments in this category.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {analytics.customFeedback && analytics.customFeedback.length > 0 && (
                        <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6 shadow-sm">
                            <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)] mb-6">
                                <FileText size={18} className="text-[var(--umbil-brand-teal)]" /> 
                                Custom Questions Feedback
                            </h3>
                            <div className="space-y-4">
                                {analytics.customFeedback.map((cf: any, idx: number) => (
                                    <div key={idx} className="bg-[var(--umbil-bg)] p-4 rounded-lg border border-[var(--umbil-divider)]">
                                        <p className="text-xs font-bold text-[var(--umbil-muted)] uppercase mb-3">Q: {cf.question}</p>
                                        <ul className="space-y-2 text-sm text-[var(--umbil-text)]">
                                            {cf.answers.map((ans: string, i: number) => (
                                                <li key={i} className="pl-3 border-l-2 border-[var(--umbil-divider)]">"{ans}"</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl overflow-hidden shadow-sm">
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
                                    onClick={generateMsfAiSummary}
                                    disabled={generatingAi}
                                    className="btn btn--outline text-sm bg-white"
                                >
                                    {generatingAi ? 'Writing...' : 'Auto-Draft'}
                                </button>
                                <button 
                                    onClick={handleSaveToLog}
                                    disabled={!reflection || isSavingLog}
                                    className="btn btn--primary text-sm shadow-md shadow-teal-500/20 flex items-center gap-2"
                                >
                                    {isSavingLog ? 'Saving...' : <><Save size={14}/> Save to Capture learning</>}
                                </button>
                            </div>
                        </div>

                        {reflection && (
                            <div className="bg-[var(--umbil-bg)] border-b border-[var(--umbil-divider)] p-6 relative">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-sm font-bold text-[var(--umbil-brand-teal)] uppercase tracking-wider">Appraisal-Ready Summary</h3>
                                    <button 
                                        onClick={copyReflection} 
                                        className="btn btn--outline text-xs bg-[var(--umbil-surface)] shadow-sm px-3 py-1 flex items-center gap-2"
                                    >
                                        {copiedReflection ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} 
                                        {copiedReflection ? 'Copied' : 'Copy Text'}
                                    </button>
                                </div>
                                <div className="prose dark:prose-invert prose-teal max-w-none text-sm text-[var(--umbil-text)] leading-relaxed">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {reflection}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        )}

                        <div className="p-6 relative min-h-[200px]">
                            {generatingAi && !reflection ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--umbil-brand-teal)] opacity-60 z-0">
                                    <Sparkles className="animate-pulse mb-3" size={24} />
                                    <p className="text-sm font-medium">Umbil AI is drafting your GMC-compliant reflection...</p>
                                </div>
                            ) : null}
                            <textarea 
                                value={reflection}
                                onChange={(e) => setReflection(e.target.value)}
                                placeholder="Write your personal reflection here, or click 'Auto-Draft' to have AI generate a starting point based on your feedback..."
                                className="w-full h-full min-h-[200px] bg-transparent border-none outline-none resize-none text-[var(--umbil-text)] placeholder:text-[var(--umbil-muted)]/50 leading-relaxed relative z-10"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}