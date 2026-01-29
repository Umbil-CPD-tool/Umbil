"use client";

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserEmail } from "@/hooks/useUser";
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, TrendingUp, Award, Activity, MessageSquareQuote, 
  Sparkles, Copy, Check, Printer, Calendar, BarChart3, FileText
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Cell
} from 'recharts';
import { calculateAnalytics, AnalyticsResult } from '@/lib/psq-analytics';

function AnalyticsContent() {
  const { email, loading: authLoading } = useUserEmail();
  const searchParams = useSearchParams();
  const surveyId = searchParams.get('id');
  
  const [loading, setLoading] = useState(true);
  const [reportTitle, setReportTitle] = useState('Feedback Analytics');
  
  // Data State
  const [data, setData] = useState<AnalyticsResult>({
    stats: { 
        totalResponses: 0, 
        averageScore: 0, 
        topArea: 'N/A', 
        lowestArea: 'N/A', 
        thresholdMet: false,
        responsesNeeded: 34 // Added to fix missing property error
    },
    trendData: [],
    breakdown: [],
    textFeedback: []
  });
  
  // Reflection State
  const [reflection, setReflection] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading) fetchStats();
  }, [email, surveyId, authLoading]);

  const fetchStats = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            setLoading(false);
            return;
        }

        let query = supabase
          .from('psq_surveys')
          .select('id, title, created_at, psq_responses(id, answers, created_at, feedback_text)')
          .eq('user_id', user.id);

        if (surveyId) {
          query = query.eq('id', surveyId);
        }

        const { data: surveys, error } = await query.order('created_at', { ascending: true });

        if (error) {
            console.error("Error fetching analytics:", error);
            setLoading(false);
            return;
        }

        if (!surveys || surveys.length === 0) {
          setLoading(false);
          return;
        }

        if (surveyId && surveys.length > 0) {
            setReportTitle(surveys[0].title);
        }

        const analytics = calculateAnalytics(surveys);
        setData(analytics);

    } catch (err) {
        console.error("Unexpected error:", err);
    } finally {
        setLoading(false);
    }
  };

  const handleGenerateReflection = async () => {
    if (data.stats.totalResponses === 0) return;
    setIsGenerating(true);
    setReflection('');

    try {
        const response = await fetch('/api/generate-reflection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: 'psq_analysis',
                stats: data.stats,
                strengths: data.stats.topArea,
                weaknesses: data.stats.lowestArea,
                comments: data.textFeedback.slice(0, 5).map(t => t.good || t.improve).filter(Boolean)
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
        alert("Failed to generate reflection. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reflection);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- PRINT PDF REPORT GENERATOR ---
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print your report.");
        return;
    }

    // FIXED: Type check for score before using toFixed
    const scoresRows = data.breakdown.map(q => {
        const scoreDisplay = typeof q.score === 'number' ? q.score.toFixed(2) : q.score;
        return `
            <tr>
                <td style="font-weight: 500;">${q.name}</td>
                <td style="text-align: right; font-weight: 700; color: #1fb8cd;">${scoreDisplay}</td>
            </tr>
        `;
    }).join('');

    const commentsHtml = data.textFeedback.map(fb => `
        <div class="comment-box">
            <div class="comment-date">${fb.date}</div>
            ${fb.good ? `<div class="comment-section"><strong>Done Well:</strong> "${fb.good}"</div>` : ''}
            ${fb.improve ? `<div class="comment-section" style="margin-top:4px;"><strong>To Improve:</strong> "${fb.improve}"</div>` : ''}
        </div>
    `).join('');

    const reflectionHtml = reflection 
        ? `<div class="reflection-box"><h3>💡 Reflection & Action Plan</h3><div class="markdown-body">${reflection.replace(/\n/g, '<br/>')}</div></div>`
        : '';

    const htmlContent = `
      <html>
        <head>
          <title>PSQ Report - ${reportTitle}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 900px; margin: 0 auto; line-height: 1.5; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: end; }
            h1 { color: #0f172a; margin: 0; font-size: 24px; }
            .subtitle { color: #64748b; font-size: 14px; margin-top: 5px; }
            .dashboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; background: #f0fdfa; padding: 20px; border-radius: 12px; border: 1px solid #ccfbf1; }
            .stat-box { text-align: center; }
            .stat-val { display: block; font-size: 24px; font-weight: 800; color: #1fb8cd; }
            .stat-label { font-size: 11px; color: #115e59; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            th { text-align: left; border-bottom: 2px solid #cbd5e1; padding: 10px; color: #64748b; text-transform: uppercase; font-size: 12px; }
            td { border-bottom: 1px solid #e2e8f0; padding: 12px 10px; color: #334155; }
            tr:last-child td { border-bottom: none; }
            .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 15px; border-left: 4px solid #1fb8cd; padding-left: 10px; }
            .comment-box { background: white; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 15px; page-break-inside: avoid; }
            .comment-date { font-size: 11px; color: #94a3b8; font-weight: 600; margin-bottom: 5px; }
            .reflection-box { background: #fff7ed; border: 1px solid #fed7aa; padding: 25px; border-radius: 8px; margin-bottom: 30px; }
            .markdown-body { font-size: 14px; color: #431407; white-space: pre-wrap; }
            @media print { body { padding: 0; } .dashboard, .reflection-box, .comment-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
             <div><h1>${reportTitle}</h1><div class="subtitle">Patient Satisfaction Questionnaire Report • Generated by Umbil</div></div>
             <div class="subtitle" style="text-align: right;">Date: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="dashboard">
             <div class="stat-box"><span class="stat-val">${data.stats.totalResponses}</span><span class="stat-label">Total Responses</span></div>
             <div class="stat-box"><span class="stat-val">${data.stats.averageScore}</span><span class="stat-label">Average Score (Max 5)</span></div>
             <div class="stat-box"><span class="stat-val" style="font-size: 18px; line-height: 1.4;">${data.stats.topArea}</span><span class="stat-label">Highest Rated Area</span></div>
          </div>
          ${reflectionHtml}
          <div class="section-title">Score Breakdown</div>
          <table><thead><tr><th>Question Area</th><th style="text-align: right;">Average Score</th></tr></thead><tbody>${scoresRows}</tbody></table>
          <div class="section-title" style="page-break-before: auto;">Patient Comments (Recent)</div>
          ${commentsHtml.length > 0 ? commentsHtml : '<p style="color: #64748b; font-style: italic;">No written comments available.</p>'}
          <script>window.onload = function() { setTimeout(() => window.print(), 500); }</script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // --- LOADING STATE ---
  if (authLoading || loading) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-[var(--umbil-bg)]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-[var(--umbil-brand-teal)] border-t-transparent rounded-full animate-spin"></div>
            </div>
        </div>
      );
  }

  // --- UMBIL STYLE CLASSES ---
  const cardClass = "bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-[var(--umbil-radius-lg)] shadow-[var(--umbil-shadow-sm)] overflow-hidden";
  const buttonPrimary = "bg-[var(--umbil-brand-teal)] text-white hover:opacity-90 transition-opacity rounded-[var(--umbil-radius-sm)] font-medium px-4 py-2 flex items-center gap-2";
  const buttonOutline = "bg-transparent border border-[var(--umbil-card-border)] text-[var(--umbil-text)] hover:bg-[var(--umbil-hover-bg)] transition-colors rounded-[var(--umbil-radius-sm)] font-medium px-4 py-2 flex items-center gap-2";

  return (
    <section className="bg-[var(--umbil-bg)] min-h-screen font-sans text-[var(--umbil-text)]">
      <div className="container mx-auto max-w-[900px] px-5 py-8 pb-20">
        
        {/* Header Section */}
        <div className="mb-8">
            <Link href="/psq" className="inline-flex items-center gap-2 text-[var(--umbil-muted)] hover:text-[var(--umbil-brand-teal)] mb-4 font-medium transition-colors text-sm">
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--umbil-text)]">{reportTitle}</h1>
                    <p className="text-[var(--umbil-muted)] mt-1">
                        {surveyId ? 'Detailed feedback analysis.' : 'Longitudinal performance overview.'}
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                     {data.trendData.length > 0 && (
                        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold bg-[var(--umbil-surface)] px-3 py-1.5 rounded-[var(--umbil-radius-sm)] border border-[var(--umbil-card-border)] shadow-sm text-[var(--umbil-muted)]">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            Updated {data.trendData[data.trendData.length - 1].date}
                        </div>
                    )}
                    <button onClick={printReport} className={buttonOutline}>
                        <Printer size={16} />
                        <span className="hidden sm:inline">Export PDF</span>
                    </button>
                </div>
            </div>
        </div>

        {/* Top Level Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Responses" value={data.stats.totalResponses} sub="Patients" icon={<Activity size={20} />} />
            <StatCard label="Overall Score" value={data.stats.averageScore} sub="/ 5.0" icon={<TrendingUp size={20} />} />
            <StatCard label="Key Strength" value={data.stats.topArea} sub="Highest Domain" icon={<Award size={20} />} isText />
        </div>

        {/* Reflection Section - Styled like 'Ask Bar' container */}
        <div className={`${cardClass} mb-8 p-1`}>
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
                <button 
                    onClick={handleGenerateReflection}
                    disabled={isGenerating || data.stats.totalResponses === 0}
                    className={`${buttonPrimary} text-sm shadow-md shadow-teal-500/20`}
                >
                    {isGenerating ? 'Writing...' : 'Auto-Draft Reflection'}
                </button>
            </div>
            
            <div className="p-6 relative group bg-[var(--umbil-surface)] min-h-[300px]">
                 <textarea 
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder={data.stats.totalResponses > 0 ? "Click 'Auto-Draft' to generate insights..." : "Collect responses first to generate a reflection."}
                    className="w-full h-full min-h-[300px] bg-transparent border-none outline-none resize-none text-[var(--umbil-text)] placeholder:text-[var(--umbil-muted)]/50 leading-relaxed"
                />
                {reflection && (
                    <div className="absolute top-4 right-4">
                        <button onClick={handleCopy} className={`${buttonOutline} text-xs bg-[var(--umbil-surface)] shadow-sm`}>
                            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} 
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Trend Chart */}
            <div className={`${cardClass} p-6`}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)]">
                        <BarChart3 size={18} className="text-[var(--umbil-brand-teal)]" /> 
                        Performance Trend
                    </h3>
                </div>
                <div className="h-64 w-full text-xs">
                    {data.trendData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--umbil-card-border)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--umbil-muted)'}} dy={10} />
                                <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fill: 'var(--umbil-muted)'}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'var(--umbil-surface)' }} 
                                    labelStyle={{ color: 'var(--umbil-muted)' }}
                                />
                                <Line type="monotone" dataKey="score" stroke="var(--umbil-brand-teal)" strokeWidth={3} dot={{ r: 4, fill: 'var(--umbil-surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <EmptyState />}
                </div>
            </div>

            {/* Breakdown Chart */}
            <div className={`${cardClass} p-6`}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)]">
                        <FileText size={18} className="text-[var(--umbil-brand-teal)]" /> 
                        Breakdown by Area
                    </h3>
                </div>
                <div className="h-64 w-full text-xs">
                     {data.breakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.breakdown} layout="vertical" margin={{ left: 80, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--umbil-card-border)" />
                                <XAxis type="number" domain={[0, 5]} hide />
                                <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{fill: 'var(--umbil-text)', fontWeight: 500}} />
                                <Tooltip cursor={{fill: 'var(--umbil-hover-bg)'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', background: 'var(--umbil-surface)' }} />
                                <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={24}>
                                    {data.breakdown.map((entry, index) => <Cell key={`cell-${index}`} fill={index < 3 ? 'var(--umbil-brand-teal)' : '#cbd5e1'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <EmptyState />}
                </div>
            </div>
        </div>

        {/* Written Feedback */}
        {data.textFeedback.length > 0 && (
            <div className={cardClass}>
                <div className="p-5 border-b border-[var(--umbil-card-border)] bg-[var(--umbil-bg)]/50 flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)]">
                        <MessageSquareQuote size={18} className="text-[var(--umbil-brand-teal)]" /> 
                        Patient Comments
                    </h3>
                </div>
                <div className="divide-y divide-[var(--umbil-divider)]">
                    {data.textFeedback.map((fb, idx) => (
                        <div key={idx} className="p-6 hover:bg-[var(--umbil-hover-bg)] transition-colors">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="md:w-32 shrink-0">
                                    <div className="text-xs font-bold text-[var(--umbil-muted)] flex items-center gap-1">
                                        <Calendar size={12} /> {fb.date}
                                    </div>
                                </div>
                                <div className="grow space-y-4">
                                    {fb.good && (
                                        <div>
                                            <span className="inline-block text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mb-1">Done Well</span>
                                            <p className="text-sm text-[var(--umbil-text)] leading-relaxed">"{fb.good}"</p>
                                        </div>
                                    )}
                                    {fb.improve && (
                                        <div>
                                            <span className="inline-block text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded mb-1">To Improve</span>
                                            <p className="text-sm text-[var(--umbil-text)] leading-relaxed">"{fb.improve}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </section>
  );
}

// Sub-components
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

function EmptyState() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-[var(--umbil-muted)]">
            <Activity size={32} className="mb-2 opacity-20" />
            <p className="text-sm font-medium">No data available yet</p>
        </div>
    );
}

export default function PSQAnalyticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--umbil-bg)]"></div>}>
      <AnalyticsContent />
    </Suspense>
  );
}