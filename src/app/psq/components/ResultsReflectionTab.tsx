'use client';
import { addCPD } from '@/lib/store';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useUserEmail } from '@/hooks/useUser';
import { 
    Lock, Printer, Sparkles, Check, Copy, Save, 
    TrendingUp, Award, Activity, MessageSquareQuote, Zap, FileText, PieChart as PieChartIcon, Info
} from 'lucide-react';
import { AnalyticsResult } from '@/lib/psq-analytics';
import { PSQ_FOOTER_TEXT } from '@/lib/psq-questions';

export default function ResultsReflectionTab({ survey, analytics, responses, required, isThresholdMet }: any) {
  const { isPro } = useUserEmail();
  const router = useRouter();

  const [copiedReflection, setCopiedReflection] = useState(false);
  
  const [executiveSummary, setExecutiveSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const hasGeneratedSummary = useRef(false);

  const [reflection, setReflection] = useState('');
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [isSavingLog, setIsSavingLog] = useState(false);

  // --- Dynamic Recharts State ---
  const [RechartsMod, setRechartsMod] = useState<any>(null);

  const PIE_COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  useEffect(() => {
      // Lazy-load Recharts only when we actually need to display the UI
      if (isThresholdMet && isPro && analytics) {
          import('recharts').then(mod => setRechartsMod(mod));
      }

      if (isThresholdMet && isPro && analytics && !hasGeneratedSummary.current) {
          hasGeneratedSummary.current = true;
          generateExecutiveSummary(analytics);
      }
  }, [analytics, isPro, isThresholdMet]);

  // Safely extract chart components once loaded
  const { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
    PieChart, Pie, Legend
  } = RechartsMod || {};

  const generateExecutiveSummary = async (statsData: AnalyticsResult) => {
      if (survey.executive_summary) {
          setExecutiveSummary(survey.executive_summary);
          return;
      }

      setIsGeneratingSummary(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();

          const response = await fetch('/api/generate-reflection', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
              },
              body: JSON.stringify({
                  mode: 'executive_summary', 
                  stats: statsData.stats,
                  strengths: statsData.stats.topArea,
                  weaknesses: statsData.stats.lowestArea,
                  comments: statsData.textFeedback.slice(0, 5).map((t: any) => t.good || t.improve).filter(Boolean)
              })
          });

          if (!response.ok) throw new Error("Failed to generate summary.");
          if (!response.body) throw new Error("No stream");
          
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let fullSummary = "";

          while (!done) {
              const { value, done: doneReading } = await reader.read();
              done = doneReading;
              const chunk = decoder.decode(value);
              fullSummary += chunk;
              setExecutiveSummary((prev) => prev + chunk);
          }

          await supabase
            .from('psq_surveys')
            .update({ executive_summary: fullSummary })
            .eq('id', survey.id);

      } catch (e) {
          setExecutiveSummary("Unable to generate automatic summary at this time. Please review the detailed metrics below.");
      } finally {
          setIsGeneratingSummary(false);
      }
  };

  const handleGenerateReflection = async () => {
    if (!analytics) return;
    setIsGeneratingReflection(true);
    setReflection('');

    try {
        const { data: { session } } = await supabase.auth.getSession();

        const response = await fetch('/api/generate-reflection', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
            },
            body: JSON.stringify({
                mode: 'psq_analysis',
                stats: analytics.stats,
                strengths: analytics.stats.topArea,
                weaknesses: analytics.stats.lowestArea,
                comments: analytics.textFeedback.slice(0, 5).map((t: any) => t.good || t.improve).filter(Boolean)
            })
        });

        if (!response.ok) throw new Error("Failed to generate reflection.");
        if (!response.body) throw new Error("No stream");
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            setReflection((prev) => prev + decoder.decode(value));
        }
    } catch (e: any) {
        alert("Failed to generate reflection.");
    } finally {
        setIsGeneratingReflection(false);
    }
  };

  const handleSaveToLog = async () => {
      if (!reflection) return;
      setIsSavingLog(true);

      const { error } = await addCPD({
          timestamp: new Date().toISOString(),
          question: `Patient Satisfaction Questionnaire (PSQ) Review - ${survey.title}`,
          answer: executiveSummary || `Reviewed feedback from ${analytics.stats.totalResponses} patients. Overall score: ${analytics.stats.averageScore}/5.0.`,
          reflection: reflection,
          tags: ['PSQ', 'Patient Feedback', 'Appraisal', 'Domain 3', 'Domain 4'],
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

  const formatDomainName = (name: string) => name.replace(/^Domain \d+: /, '');

  const printReport = () => {
    if (!analytics) return;
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
        alert("Please allow popups to print your report.");
        return;
    }

    const safeTitle = survey.title.replace(/[^a-zA-Z0-9]/g, '_');
    const docTitle = `Umbil_PSQ_Report_${safeTitle}`;

    const scoresRows = analytics.breakdown.map((q: any) => {
        const scoreDisplay = typeof q.score === 'number' ? q.score.toFixed(2) : q.score;
        return `<tr><td style="font-weight: 500;">${q.name}</td><td style="text-align: right; font-weight: 700; color: #1fb8cd;">${scoreDisplay}</td></tr>`;
    }).join('');

    const appointmentRows = analytics.appointmentTypes && analytics.appointmentTypes.length > 0 
        ? analytics.appointmentTypes.map((t: any) => `<tr><td style="font-weight: 500;">${t.name}</td><td style="text-align: right; font-weight: 700; color: #64748b;">${t.value}</td></tr>`).join('')
        : `<tr><td colspan="2" style="color: #94a3b8; font-style: italic; text-align: center;">No data recorded</td></tr>`;

    const goodComments = analytics.textFeedback.filter((fb: any) => fb.good).map((fb: any) => `<div class="feedback-card good">"${fb.good}"</div>`).join('');
    const improveComments = analytics.textFeedback.filter((fb: any) => fb.improve).map((fb: any) => `<div class="feedback-card improve">"${fb.improve}"</div>`).join('');
    
    let commentsHtml = '';

    if (goodComments || improveComments) {
        commentsHtml = `<div class="feedback-container">`;
        
        if (goodComments) {
            commentsHtml += `<div class="feedback-column"><div class="feedback-header good">Done Well</div>${goodComments}</div>`;
        }
        if (improveComments) {
            commentsHtml += `<div class="feedback-column"><div class="feedback-header improve">Areas for Improvement</div>${improveComments}</div>`;
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

    const summaryHtml = executiveSummary ? `<div class="summary-box"><strong>Appraisal-Ready Summary:</strong> ${executiveSummary}</div>` : '';
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
            .summary-box { background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin-bottom: 30px; font-size: 14px; color: #1e3a8a; border-radius: 0 8px 8px 0; }
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
            .feedback-card { padding: 12px 16px; margin-bottom: 12px; border-radius: 6px; font-size: 13px; font-style: italic; color: #334155; line-height: 1.5; }
            .feedback-card.good { background-color: #ecfdf5; border-left: 3px solid #10b981; }
            .feedback-card.improve { background-color: #fffbeb; border-left: 3px solid #f59e0b; }
            
            .comment-section { margin-bottom: 20px; }
            .reflection-box { background: #fff7ed; border: 1px solid #fed7aa; padding: 25px; border-radius: 8px; margin-bottom: 30px; }
            .markdown-body { font-size: 14px; color: #431407; white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <div class="header">
             <div><h1>${survey.title}</h1><div class="subtitle">Patient Satisfaction Questionnaire Report • Generated by Umbil</div></div>
          </div>
          ${summaryHtml}
          <div class="dashboard">
             <div class="stat-box"><span class="stat-val">${analytics.stats.totalResponses}</span><span class="stat-label">Total Responses</span></div>
             <div class="stat-box"><span class="stat-val">${analytics.stats.averageScore}</span><span class="stat-label">Average Score (Max 5)</span></div>
             <div class="stat-box"><span class="stat-val" style="font-size: 18px; line-height: 1.4;">${formatDomainName(analytics.stats.topArea)}</span><span class="stat-label">Highest Rated Area</span></div>
          </div>
          
          <div class="data-tables">
              <div class="data-table-wrapper large">
                  <div class="section-title">Score Breakdown</div>
                  <table><thead><tr><th>Question Area</th><th style="text-align: right;">Average Score</th></tr></thead><tbody>${scoresRows}</tbody></table>
              </div>
              <div class="data-table-wrapper">
                  <div class="section-title">Consultations</div>
                  <table><thead><tr><th>Type</th><th style="text-align: right;">Count</th></tr></thead><tbody>${appointmentRows}</tbody></table>
              </div>
          </div>

          ${reflectionHtml}
          
          <div class="section-title" style="page-break-before: always;">Thematic Patient Comments</div>
          ${commentsHtml}
          
          ${customFeedbackHtml ? `
            <div class="section-title" style="page-break-before: auto; margin-top: 30px;">Practice-Specific Questions</div>
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

  const copyReflection = () => {
    navigator.clipboard.writeText(reflection);
    setCopiedReflection(true);
    setTimeout(() => setCopiedReflection(false), 2000);
  };

  if (!isThresholdMet) {
      return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center max-w-2xl mx-auto mt-8 animate-in fade-in duration-300">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={24}/>
              </div>
              <h3 className="text-xl font-bold text-amber-900 mb-2">Results & Reflection Locked</h3>
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
      );
  }

  if (!isPro) {
      return (
          <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm mt-8 animate-in fade-in duration-300">
              <div className="w-16 h-16 bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-[var(--umbil-text)]">Unlock Your Patient Feedback Report</h3>
              <p className="text-[var(--umbil-muted)] mb-8">
                  Your {responses} anonymous responses have been securely collated. Upgrade to Umbil Pro to unlock the AI interpretation, thematic analysis, and appraisal-ready exports.
              </p>
              <button 
                  onClick={() => router.push('/pro')} 
                  className="btn btn--primary px-8 py-4 text-lg w-full max-w-md mx-auto flex justify-center items-center gap-2"
              >
                  View Pro Plans
              </button>
          </div>
      );
  }

  const goodComments = analytics?.textFeedback.filter((fb: any) => fb.good) || [];
  const improveComments = analytics?.textFeedback.filter((fb: any) => fb.improve) || [];

  return (
    <div className="space-y-8 mt-4 animate-in fade-in duration-300">
        <div className="flex justify-between items-end mb-2">
            <div>
                <h2 className="text-2xl font-bold text-[var(--umbil-text)]">Final Report & Analytics</h2>
                <p className="text-[var(--umbil-muted)] mt-1">Detailed feedback analysis for this cycle.</p>
            </div>
            <button onClick={printReport} className="btn btn--outline flex items-center gap-2">
                <Printer size={16} /> Export PDF
            </button>
        </div>

        {/* AI Appraisal-Ready Summary Block */}
        <div className="bg-[var(--umbil-brand-teal)]/10 border border-[var(--umbil-brand-teal)]/20 rounded-xl p-6 shadow-sm flex items-start gap-4">
            <div className="mt-1 p-2 bg-[var(--umbil-brand-teal)]/20 text-[var(--umbil-brand-teal)] rounded-lg shrink-0">
                <Zap size={20} className={isGeneratingSummary ? "animate-pulse" : ""} />
            </div>
            <div>
                <h3 className="text-sm font-bold text-[var(--umbil-brand-teal)] mb-1 uppercase tracking-wider">Appraisal-Ready Summary</h3>
                {isGeneratingSummary && !executiveSummary ? (
                    <p className="text-[var(--umbil-brand-teal)]/70 text-sm animate-pulse">Analyzing responses to generate a summary...</p>
                ) : (
                    <p className="text-[var(--umbil-text)] text-sm leading-relaxed">{executiveSummary}</p>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Responses" value={analytics.stats.totalResponses} sub="Patients" icon={<Activity size={20} />} />
            <StatCard label="Overall Score" value={analytics.stats.averageScore} sub="/ 5.0" icon={<TrendingUp size={20} />} />
            <StatCard label="Key Strength" value={formatDomainName(analytics.stats.topArea)} sub="Highest Domain" icon={<Award size={20} />} isText />
        </div>
        
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Enhanced Bar Chart */}
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6 shadow-sm flex flex-col">
                <div className="mb-4">
                    <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)]">
                        <FileText size={18} className="text-[var(--umbil-brand-teal)]" /> 
                        Breakdown by Area
                    </h3>
                    <p className="text-xs text-[var(--umbil-muted)] mt-1 flex items-center gap-1">
                        <Info size={12}/> The dotted line indicates the standard GMC appraisal target score (4.0).
                    </p>
                </div>
                
                <div className="h-72 w-full text-xs flex-grow relative">
                    {RechartsMod && analytics.breakdown.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.breakdown} layout="vertical" margin={{ top: 20, left: 80, right: 30, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--umbil-card-border)" />
                                <XAxis type="number" domain={[0, 5]} hide />
                                <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{fill: 'var(--umbil-text)', fontWeight: 500}} />
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
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-[var(--umbil-muted)] bg-[var(--umbil-hover-bg)]/30 rounded-lg">
                            {!RechartsMod ? (
                                <span className="flex items-center gap-2 animate-pulse"><Zap size={14}/> Loading Visualisations...</span>
                            ) : "No data available yet"}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Appointment Type Pie Chart */}
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6 shadow-sm flex flex-col">
                <div className="mb-4">
                    <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)]">
                        <PieChartIcon size={18} className="text-[var(--umbil-brand-teal)]" /> 
                        Consultation Type
                    </h3>
                    <p className="text-xs text-[var(--umbil-muted)] mt-1">Breakdown of patient interaction methods.</p>
                </div>
                
                <div className="h-72 w-full text-xs flex justify-center items-center flex-grow">
                    {RechartsMod && analytics.appointmentTypes && analytics.appointmentTypes.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={analytics.appointmentTypes}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {analytics.appointmentTypes.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-[var(--umbil-muted)] bg-[var(--umbil-hover-bg)]/30 rounded-lg">
                            {!RechartsMod ? (
                                <span className="flex items-center gap-2 animate-pulse"><Zap size={14}/> Loading Visualisations...</span>
                            ) : (
                                <div className="text-center px-4">
                                    <p className="mb-1">No consultation type data recorded.</p>
                                    <p className="text-[10px] opacity-70">Make sure your public survey asks this question.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

        </div>

        {/* Thematic Patient Comments */}
        {(goodComments.length > 0 || improveComments.length > 0) && (
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-[var(--umbil-card-border)] bg-[var(--umbil-bg)]/50">
                    <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)]">
                        <MessageSquareQuote size={18} className="text-[var(--umbil-brand-teal)]" /> 
                        Patient Comments
                    </h3>
                    <p className="text-xs text-[var(--umbil-muted)] mt-1">Displayed randomly to protect anonymity.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--umbil-divider)]">
                    <div className="p-6">
                        <h4 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-4">Done Well</h4>
                        {goodComments.length > 0 ? (
                            <ul className="space-y-4">
                                {goodComments.map((fb: any, idx: number) => (
                                    <li key={idx} className="text-sm text-[var(--umbil-text)] leading-relaxed bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                                        "{fb.good}"
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No comments in this category.</p>
                        )}
                    </div>

                    <div className="p-6">
                        <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-4">Areas for Improvement</h4>
                        {improveComments.length > 0 ? (
                            <ul className="space-y-4">
                                {improveComments.map((fb: any, idx: number) => (
                                    <li key={idx} className="text-sm text-[var(--umbil-text)] leading-relaxed bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                                        "{fb.improve}"
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-400 italic">No comments in this category.</p>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Custom Practice Feedback */}
        {analytics.customFeedback && analytics.customFeedback.length > 0 && (
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-6 shadow-sm">
                <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)] mb-6">
                    <FileText size={18} className="text-[var(--umbil-brand-teal)]" /> 
                    Practice-Specific Feedback
                </h3>
                <div className="space-y-4">
                    {analytics.customFeedback.map((cf: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 dark:bg-zinc-900/50 p-4 rounded-lg border border-gray-100 dark:border-zinc-800">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Q: {cf.question}</p>
                            <ul className="space-y-2 text-sm text-[var(--umbil-text)]">
                                {cf.answers.map((ans: string, i: number) => (
                                    <li key={i} className="pl-3 border-l-2 border-gray-200 dark:border-zinc-700">"{ans}"</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Reflection Area */}
        <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl overflow-hidden shadow-sm">
            <div className="bg-[var(--umbil-hover-bg)]/50 p-6 border-b border-[var(--umbil-card-border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--umbil-brand-teal)] text-white rounded-[var(--umbil-radius-sm)]">
                        <Sparkles size={18} fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold">Appraisal-Ready Reflection</h3>
                        <p className="text-sm text-[var(--umbil-muted)]">Generate a structured reflection for your portfolio.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleGenerateReflection}
                        disabled={isGeneratingReflection}
                        className="btn btn--outline text-sm bg-white"
                    >
                        {isGeneratingReflection ? 'Writing...' : 'Auto-Draft'}
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
            <div className="p-6 relative min-h-[300px]">
                {isGeneratingReflection && !reflection ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--umbil-brand-teal)] opacity-60 z-0">
                        <Sparkles className="animate-pulse mb-3" size={24} />
                        <p className="text-sm font-medium">Umbil AI is drafting your GMC-compliant reflection...</p>
                    </div>
                ) : null}
                <textarea 
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Click 'Auto-Draft' to generate insights..."
                    className="w-full h-full min-h-[300px] bg-transparent border-none outline-none resize-none text-[var(--umbil-text)] placeholder:text-[var(--umbil-muted)]/50 leading-relaxed relative z-10"
                />
                {reflection && (
                    <div className="absolute top-4 right-4 z-20">
                        <button onClick={copyReflection} className="btn btn--outline text-xs bg-[var(--umbil-surface)] shadow-sm px-3 py-1 flex items-center gap-2">
                            {copiedReflection ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />} 
                            {copiedReflection ? 'Copied' : 'Copy Text'}
                        </button>
                    </div>
                )}
            </div>
            <div className="px-6 pb-6 text-xs text-gray-400 text-right">
                {PSQ_FOOTER_TEXT}
            </div>
        </div>
    </div>
  );
}

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