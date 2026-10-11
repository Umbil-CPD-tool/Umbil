'use client';
import { addCPD } from '@/lib/store';
import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useUserEmail } from '@/hooks/useUserEmail';
import { useCpdStreaks } from '@/hooks/useCpdStreaks';
import StreakPopup from '@/components/home/StreakPopup';
import { getStreakCelebration, STUDENT_PRO_OFFER, type LearningMilestone } from '@umbil/shared';
import { 
    Lock, Printer, Download, Copy,
    TrendingUp, Award, Activity, MessageSquareQuote, Zap, FileText, PieChart as PieChartIcon, Info
} from 'lucide-react';
import { AnalyticsResult } from '@/lib/psq-analytics';
import { PSQ_FOOTER_TEXT } from '@/lib/psq-questions';
import { parseAppraisalPack } from '@/lib/appraisalAi';
import { buildFeedbackReport, feedbackReportToHtml, resolveGmcRows } from '@/lib/feedbackReport';
import { ReflectionPanel } from '@/components/feedback/ReflectionPanel';
import { reflectionHasContent, reflectionToPlainText } from '@/lib/reflectionHtml';
import { 
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
    PieChart, Pie, Legend
} from 'recharts';

export default function ResultsReflectionTab({ survey, analytics, responses, required, isThresholdMet }: any) {
  const { isPro } = useUserEmail();
  const router = useRouter();
  const { hasLoggedThisWeek, currentStreak, totalLogs, loading: streaksLoading, refetch: refetchStreaks } = useCpdStreaks();
  const [isStreakPopupOpen, setIsStreakPopupOpen] = useState(false);
  const [streakToDisplay, setStreakToDisplay] = useState(0);
  const [milestoneToDisplay, setMilestoneToDisplay] = useState<LearningMilestone | null>(null);

  const [packText, setPackText] = useState(survey?.executive_summary || '');
  const [isGeneratingPack, setIsGeneratingPack] = useState(false);
  const hasGeneratedPack = useRef(false);

  const [reflection, setReflection] = useState('');
  const [isSavingLog, setIsSavingLog] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const pack = useMemo(() => parseAppraisalPack(packText), [packText]);
  const executiveSummary = pack.executiveSummary;

  const PIE_COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  const applyPack = (text: string) => {
    setPackText(text);
  };

  useEffect(() => {
    if (survey?.executive_summary) {
      applyPack(survey.executive_summary);
    }
  }, [survey?.executive_summary]);

  useEffect(() => {
      if (isThresholdMet && isPro && analytics && !hasGeneratedPack.current) {
          hasGeneratedPack.current = true;
          void generateAppraisalPack(analytics, false);
      }
  }, [analytics, isPro, isThresholdMet]);

  const buildPackRequestBody = (statsData: AnalyticsResult) => ({
    mode: 'psq_appraisal_pack',
    stats: statsData.stats,
    strengths: statsData.stats.topArea,
    weaknesses: statsData.stats.lowestArea,
    domainScores: statsData.breakdown,
    appointmentTypes: statsData.appointmentTypes,
    comments: statsData.textFeedback.map((t: any) => t.good).filter(Boolean).slice(0, 24),
    improveComments: statsData.textFeedback.map((t: any) => t.improve).filter(Boolean).slice(0, 24),
    exampleComments: statsData.textFeedback.map((t: any) => t.example).filter(Boolean).slice(0, 24),
    additionalComments: statsData.textFeedback.map((t: any) => t.additional).filter(Boolean).slice(0, 24),
  });

  const generateAppraisalPack = async (statsData: AnalyticsResult, force = false) => {
      if (!force && survey.executive_summary) {
          applyPack(survey.executive_summary);
          return;
      }

      setIsGeneratingPack(true);
      setPackText('');
      try {
          const { data: { session } } = await supabase.auth.getSession();

          const response = await fetch('/api/generate-reflection', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {})
              },
              body: JSON.stringify(buildPackRequestBody(statsData))
          });

          if (!response.ok) throw new Error("Failed to generate appraisal pack.");
          if (!response.body) throw new Error("No stream");
          
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let done = false;
          let fullPack = "";

          while (!done) {
              const { value, done: doneReading } = await reader.read();
              done = doneReading;
              const chunk = decoder.decode(value);
              fullPack += chunk;
              setPackText(fullPack);
          }

          applyPack(fullPack);

          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              await supabase
                .from('psq_surveys')
                .update({ executive_summary: fullPack })
                .eq('id', survey.id)
                .eq('user_id', user.id);
          }

      } catch (e) {
          setPackText("Unable to generate automatic appraisal summary at this time. Please review the detailed metrics below.");
      } finally {
          setIsGeneratingPack(false);
      }
  };

  const handleSaveToLog = async () => {
      if (!reflectionHasContent(reflection)) return;
      setIsSavingLog(true);
      const celebration = streaksLoading
          ? { show: false, streakCount: currentStreak, milestone: null as LearningMilestone | null }
          : getStreakCelebration({ hasLoggedThisWeek, currentStreak, totalLogs });

      const { error } = await addCPD({
          timestamp: new Date().toISOString(),
          question: `Patient Satisfaction Questionnaire (PSQ) Review - ${survey.title}`,
          answer: executiveSummary || `Reviewed feedback from ${analytics.stats.totalResponses} patients. Overall score: ${analytics.stats.averageScore}/5.0.`,
          reflection: reflectionToPlainText(reflection),
          tags: ['PSQ', 'Patient Feedback', 'Appraisal', 'Domain 3', 'Domain 4'],
          duration: 10
      });

      if (error) {
          if (error.message === "LIMIT_REACHED") {
              if (window.confirm(`You have reached your monthly CPD logging limit. Please upgrade to Pro. ${STUDENT_PRO_OFFER}\n\nOpen your profile to add a .ac.uk email?`)) {
                  router.push("/profile?student=1");
              }
          } else {
              alert("Could not save to Capture learning. Please try again.");
          }
      } else if (celebration.show) {
          setStreakToDisplay(celebration.streakCount);
          setMilestoneToDisplay(celebration.milestone);
          setIsStreakPopupOpen(true);
          void refetchStreaks();
      } else {
          alert("Saved to Capture learning successfully!");
          void refetchStreaks();
      }
      
      setIsSavingLog(false);
  };

  const formatDomainName = (name: string) => name.replace(/^Domain \d+: /, '');

  const buildReport = () => {
    if (!analytics) return null;
    const textFeedback = analytics.textFeedback ?? [];
    const commentItems = (key: string) =>
      textFeedback.map((fb: Record<string, string>) => fb[key]).filter((item: string) => item && item.trim());
    const safeTitle = String(survey?.title || 'PSQ').replace(/[^a-zA-Z0-9]/g, '_');
    const dateRange = survey?.created_at
      ? `${new Date(survey.created_at).toLocaleDateString('en-GB')} – ${new Date().toLocaleDateString('en-GB')}`
      : new Date().toLocaleDateString('en-GB');

    return buildFeedbackReport({
      docTitle: `Umbil_PSQ_Report_${safeTitle}`,
      title: survey?.title || 'Patient Satisfaction Questionnaire',
      kindLabel: 'Patient Satisfaction Questionnaire Report',
      dateRange,
      responseCount: analytics.stats.totalResponses,
      averageScore: String(analytics.stats.averageScore),
      topArea: formatDomainName(analytics.stats.topArea),
      scoreTitle: 'Domain Scores',
      scoreRows: analytics.breakdown.map((row: { name: string; score: number | string }) => ({
        name: row.name,
        score: typeof row.score === 'number' ? row.score.toFixed(2) : String(row.score ?? ''),
      })),
      contextTitle: 'Consultation Types',
      contextRows: (analytics.appointmentTypes ?? []).map((row: { name: string; value: number }) => ({
        name: row.name,
        value: String(row.value),
      })),
      pack: parseAppraisalPack(packText),
      breakdown: analytics.breakdown,
      useScoreGmcFallback: true,
      separatePdp: true,
      reflection,
      commentsTitle: 'Patient Comments',
      commentColumns: [
        {
          groups: [
            { title: 'Done Well', tone: 'good', items: commentItems('good') },
            { title: 'Examples Provided', tone: 'good', items: commentItems('example') },
          ],
        },
        {
          groups: [
            { title: 'Areas for Improvement', tone: 'improve', items: commentItems('improve') },
            { title: 'Additional Comments', tone: 'neutral', items: commentItems('additional') },
          ],
        },
      ],
      customTitle: 'Practice-Specific Questions',
      customFeedback: analytics.customFeedback ?? [],
    });
  };

  const printReport = () => {
    const report = buildReport();
    if (!report) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print your report.');
      return;
    }
    printWindow.document.open();
    printWindow.document.write(feedbackReportToHtml(report, { autoPrint: true }));
    printWindow.document.title = report.docTitle;
    printWindow.document.close();
  };

  const downloadReport = async () => {
    const report = buildReport();
    if (!report) return;
    setIsDownloadingPdf(true);
    try {
      const { downloadFeedbackReport } = await import('@/components/feedback/downloadFeedbackReport');
      await downloadFeedbackReport(report);
    } catch (error) {
      console.error(error);
      alert('Could not create the PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const gmcRows = analytics ? resolveGmcRows(pack, analytics.breakdown, true) : [];

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

  // UPDATED: Gating strictly behind isPro status instead of survey.has_paid
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
  const exampleComments = analytics?.textFeedback.filter((fb: any) => fb.example) || [];
  const improveComments = analytics?.textFeedback.filter((fb: any) => fb.improve) || [];
  const additionalComments = analytics?.textFeedback.filter((fb: any) => fb.additional) || [];

  return (
    <div className="space-y-8 mt-4 animate-in fade-in duration-300">
        <div className="flex justify-between items-end mb-2 gap-3 flex-wrap">
            <div>
                <h2 className="text-2xl font-bold text-[var(--umbil-text)]">Final Report & Analytics</h2>
                <p className="text-[var(--umbil-muted)] mt-1">Detailed feedback analysis for this cycle.</p>
            </div>
            <div className="flex gap-2 flex-wrap">
                <button type="button" onClick={printReport} className="btn btn--outline flex items-center gap-2">
                    <Printer size={16} /> Print
                </button>
                <button type="button" onClick={() => void downloadReport()} disabled={isDownloadingPdf} className="btn btn--primary flex items-center gap-2">
                    <Download size={16} /> {isDownloadingPdf ? 'Preparing PDF…' : 'Download PDF'}
                </button>
            </div>
        </div>

        {/* AI Appraisal-Ready Summary Block */}
        <div className="bg-[var(--umbil-brand-teal)]/10 border border-[var(--umbil-brand-teal)]/20 rounded-xl p-6 shadow-sm flex items-start gap-4">
            <div className="mt-1 p-2 bg-[var(--umbil-brand-teal)]/20 text-[var(--umbil-brand-teal)] rounded-lg shrink-0">
                <Zap size={20} className={isGeneratingPack ? "animate-pulse" : ""} />
            </div>
            <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-bold text-[var(--umbil-brand-teal)] uppercase tracking-wider">Appraisal-Ready Summary</h3>
                  {executiveSummary ? (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(executiveSummary);
                      }}
                      className="btn btn--outline text-xs bg-[var(--umbil-surface)] px-2 py-1 flex items-center gap-1"
                    >
                      <Copy size={12} /> Copy
                    </button>
                  ) : null}
                </div>
                {isGeneratingPack && !executiveSummary ? (
                    <p className="text-[var(--umbil-brand-teal)]/70 text-sm animate-pulse">Analysing responses into appraisal evidence...</p>
                ) : (
                    <p className="text-[var(--umbil-text)] text-sm leading-relaxed">{executiveSummary || "Generate an appraisal pack to create a copyable summary."}</p>
                )}
            </div>
        </div>

        {(pack.strengths.length > 0 || pack.developmentThemes.length > 0 || isGeneratingPack) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--umbil-surface)] border border-emerald-200/60 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide mb-3">Top Strengths Identified</h3>
              {pack.strengths.length > 0 ? (
                <ul className="space-y-2">
                  {pack.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-[var(--umbil-text)] pl-3 border-l-2 border-emerald-400">{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--umbil-muted)] italic">{isGeneratingPack ? "Extracting themes…" : "No themes yet."}</p>
              )}
            </div>
            <div className="bg-[var(--umbil-surface)] border border-amber-200/60 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wide mb-3">Areas for Improvement</h3>
              {pack.developmentThemes.length > 0 ? (
                <ul className="space-y-2">
                  {pack.developmentThemes.map((s, i) => (
                    <li key={i} className="text-sm text-[var(--umbil-text)] pl-3 border-l-2 border-amber-400">{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--umbil-muted)] italic">{isGeneratingPack ? "Extracting themes…" : "No themes yet."}</p>
              )}
            </div>
          </div>
        )}

        {gmcRows.length > 0 && (
          <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--umbil-brand-teal)] uppercase tracking-wide mb-3">GMC Domain Mapping</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {gmcRows.map((row) => (
                <div key={row.domain} className="flex justify-between gap-2 border-b border-[var(--umbil-divider)] pb-2">
                  <span>{row.short}</span>
                  <strong>{row.level}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {pack.supportingEvidence.length > 0 && (
          <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--umbil-muted)] uppercase tracking-wide mb-3">Supporting Evidence</h3>
            <ul className="space-y-2">
              {pack.supportingEvidence.map((s, i) => (
                <li key={i} className="text-sm text-[var(--umbil-text)] italic pl-3 border-l-2 border-[var(--umbil-brand-teal)]/40">
                  “{s}”
                </li>
              ))}
            </ul>
          </div>
        )}

        {pack.pdpSuggestions.length > 0 && (
          <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[var(--umbil-brand-teal)] uppercase tracking-wide mb-3">Suggested PDP</h3>
            <ul className="space-y-2">
              {pack.pdpSuggestions.map((s, i) => (
                <li key={i} className="text-sm text-[var(--umbil-text)] flex gap-2">
                  <span className="text-[var(--umbil-brand-teal)] font-bold">{i === 0 ? "Must-do" : i === 1 ? "Stretch" : `${i + 1}.`}</span>
                  <span>{s.replace(/^(Must-do|Stretch):\s*/i, "")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

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
                
                <div className="h-72 w-full text-xs flex-grow">
                    {analytics.breakdown.length > 0 ? (
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
                    ) : <div className="flex h-full items-center justify-center text-[var(--umbil-muted)]">No data available yet</div>}
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
                    {analytics.appointmentTypes && analytics.appointmentTypes.length > 0 ? (
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
                        <div className="text-[var(--umbil-muted)] text-center px-4">
                            <p className="mb-1">No consultation type data recorded.</p>
                            <p className="text-[10px] opacity-70">Make sure your public survey asks this question.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>

        {/* Thematic Patient Comments */}
        {(goodComments.length > 0 || exampleComments.length > 0 || improveComments.length > 0 || additionalComments.length > 0) && (
            <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-[var(--umbil-card-border)] bg-[var(--umbil-bg)]/50">
                    <h3 className="font-bold flex items-center gap-2 text-[var(--umbil-text)]">
                        <MessageSquareQuote size={18} className="text-[var(--umbil-brand-teal)]" /> 
                        Patient Comments
                    </h3>
                    <p className="text-xs text-[var(--umbil-muted)] mt-1">Displayed randomly to protect anonymity.</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--umbil-divider)]">
                    <div className="p-6 space-y-8">
                        <div>
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
                            ) : (
                                <p className="text-sm text-gray-400 italic">No comments in this category.</p>
                            )}
                        </div>
                    </div>

                    <div className="p-6 space-y-8">
                        <div>
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
                            ) : (
                                <p className="text-sm text-gray-400 italic">No comments in this category.</p>
                            )}
                        </div>
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

        <ReflectionPanel
            value={reflection}
            onChange={setReflection}
            onSave={handleSaveToLog}
            isSaving={isSavingLog}
            footer={<div className="px-6 pb-6 text-xs text-gray-400 text-right">{PSQ_FOOTER_TEXT}</div>}
        />
        <StreakPopup
          isOpen={isStreakPopupOpen}
          streakCount={streakToDisplay}
          milestone={milestoneToDisplay}
          onClose={() => setIsStreakPopupOpen(false)}
        />
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