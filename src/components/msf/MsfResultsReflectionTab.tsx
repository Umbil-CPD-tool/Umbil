'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useUserEmail } from '@/hooks/useUserEmail';
import { Copy, Lock, FileText, Printer, Download, TrendingUp, Award, Activity, MessageSquareQuote, Info, PieChart as PieChartIcon, Zap } from 'lucide-react';
import { MsfAnalyticsResult } from '@/lib/msf-analytics';
import { addCPD } from '@/lib/store';
import { useCpdStreaks } from '@/hooks/useCpdStreaks';
import StreakPopup from '@/components/home/StreakPopup';
import { getStreakCelebration, STUDENT_PRO_OFFER, type LearningMilestone } from '@umbil/shared';
import { parseAppraisalPack } from '@/lib/appraisalAi';
import { buildFeedbackReport, cycleReportFileName, feedbackReportToHtml } from '@/lib/feedbackReport';
import { ReflectionPanel, type ReflectionPanelHandle } from '@/components/feedback/ReflectionPanel';
import { reflectionHasContent, reflectionToPlainText, sanitizeReflectionHtml } from '@/lib/reflectionHtml';
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
    const { isPro } = useUserEmail();
    const router = useRouter();
    const { hasLoggedThisWeek, currentStreak, totalLogs, loading: streaksLoading, refetch: refetchStreaks } = useCpdStreaks();
    const [isStreakPopupOpen, setIsStreakPopupOpen] = useState(false);
    const [streakToDisplay, setStreakToDisplay] = useState(0);
    const [milestoneToDisplay, setMilestoneToDisplay] = useState<LearningMilestone | null>(null);

    const [packText, setPackText] = useState(cycle.ai_summary || '');
    const [reflection, setReflection] = useState('');
    const [isSavingReflection, setIsSavingReflection] = useState(false);
    const [reflectionSaved, setReflectionSaved] = useState(false);
    const reflectionRef = useRef<ReflectionPanelHandle>(null);
    const reflectionLoaded = useRef(false);
    const [generatingAi, setGeneratingAi] = useState(false);
    const [isSavingLog, setIsSavingLog] = useState(false);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const hasGeneratedPack = useRef(false);

    const pack = useMemo(() => parseAppraisalPack(packText), [packText]);
    const executiveSummary = pack.executiveSummary;

    const responses = analytics.stats.totalResponses;
    const required = analytics.stats.targetThreshold;
    const isThresholdMet = analytics.stats.thresholdMet;
    const isClosed = cycle.status === 'closed' || isThresholdMet;

    const strengthsComments = analytics.textFeedback.filter((fb: any) => fb.strengths);
    const exampleComments = analytics.textFeedback.filter((fb: any) => fb.example);
    const improveComments = analytics.textFeedback.filter((fb: any) => fb.improve);
    const additionalComments = analytics.textFeedback.filter((fb: any) => fb.additional);

    const applyPack = (text: string) => {
        setPackText(text);
    };

    useEffect(() => {
        if (cycle?.ai_summary) {
            applyPack(cycle.ai_summary);
        }
    }, [cycle?.ai_summary]);

    useEffect(() => {
        if (reflectionLoaded.current || !cycle?.id) return;
        reflectionLoaded.current = true;
        if (typeof cycle.clinician_reflection === 'string' && reflectionHasContent(cycle.clinician_reflection)) {
            setReflection(cycle.clinician_reflection);
        }
    }, [cycle?.id, cycle?.clinician_reflection]);

    useEffect(() => {
        if (isClosed && isPro && analytics && !hasGeneratedPack.current) {
            hasGeneratedPack.current = true;
            void generateMsfAiSummary(false);
        }
    }, [analytics, isPro, isClosed]);

    const generateMsfAiSummary = async (force = true) => {
        if (!force && cycle.ai_summary) {
            applyPack(cycle.ai_summary);
            return;
        }

        setGeneratingAi(true);
        setPackText('');
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
                body: JSON.stringify({
                    cycle_id: cycle.id,
                    averages,
                    stats: analytics.stats,
                    domainScores: analytics.breakdown,
                    roleTypes: analytics.roleTypes,
                }), 
            });
            
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Server responded with an error");
            if (data.summary) applyPack(data.summary);

        } catch (err: any) {
            alert(`Error generating summary: ${err.message}`); 
        } finally {
            setGeneratingAi(false);
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
            question: `Multi-Source Feedback (MSF) Review - ${cycle.title}`,
            answer: executiveSummary || `Reviewed feedback from ${responses} colleagues. Overall score: ${analytics.stats.averageScore}/5.0.`,
            reflection: reflectionToPlainText(reflection),
            tags: ['MSF', 'Colleague Feedback', 'Appraisal', 'Domain 3', 'Domain 4'],
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

    const buildReport = () => {
        const dateRange = cycle?.created_at
            ? `${new Date(cycle.created_at).toLocaleDateString('en-GB')} – ${new Date().toLocaleDateString('en-GB')}`
            : new Date().toLocaleDateString('en-GB');
        const commentItems = (key: 'strengths' | 'example' | 'improve' | 'additional') =>
            analytics.textFeedback.map((fb: Record<string, string>) => fb[key]).filter((item) => item && item.trim());

        const writtenReflection = sanitizeReflectionHtml(reflectionRef.current?.getHtml() || reflection);

        return buildFeedbackReport({
            docTitle: cycleReportFileName('MSF', cycle.title || 'Cycle'),
            title: cycle.title || 'MSF Cycle',
            kindLabel: 'Multi-Source Feedback Report',
            dateRange,
            responseCount: analytics.stats.totalResponses,
            averageScore: String(analytics.stats.averageScore),
            topArea: analytics.stats.topArea,
            scoreTitle: 'Score Breakdown',
            scoreRows: analytics.breakdown.map((row) => ({
                name: row.name,
                score: typeof row.score === 'number' ? row.score.toFixed(2) : String(row.score ?? ''),
            })),
            contextTitle: 'Respondent Roles',
            contextRows: (analytics.roleTypes ?? []).map((row) => ({
                name: row.name,
                value: String(row.value),
            })),
            pack: parseAppraisalPack(packText),
            useScoreGmcFallback: false,
            separatePdp: false,
            reflection: writtenReflection,
            commentsTitle: 'Thematic Colleague Comments',
            commentColumns: [
                {
                    groups: [
                        { title: 'Greatest Strengths', tone: 'good', items: commentItems('strengths') },
                        { title: 'Examples Provided', tone: 'good', items: commentItems('example') },
                    ],
                },
                {
                    groups: [
                        { title: 'Areas for Development', tone: 'improve', items: commentItems('improve') },
                        { title: 'Additional Comments', tone: 'neutral', items: commentItems('additional') },
                    ],
                },
            ],
            customTitle: 'Custom Questions',
            customFeedback: analytics.customFeedback ?? [],
        });
    };

    const saveReflection = async () => {
        const html = sanitizeReflectionHtml(reflectionRef.current?.getHtml() || reflection);
        if (!reflectionHasContent(html)) return;
        setReflection(html);
        setIsSavingReflection(true);
        setReflectionSaved(false);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { error } = await supabase
                .from('msf_cycles')
                .update({ clinician_reflection: html })
                .eq('id', cycle.id)
                .eq('user_id', user.id);
            if (error) throw error;
            setReflectionSaved(true);
        } catch (error) {
            console.error(error);
            alert('Could not save your reflection. Please try again.');
        } finally {
            setIsSavingReflection(false);
        }
    };

    const printReport = () => {
        const report = buildReport();
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
        setIsDownloadingPdf(true);
        try {
            const { downloadFeedbackReport } = await import('@/components/feedback/downloadFeedbackReport');
            await downloadFeedbackReport(buildReport());
        } catch (error) {
            console.error(error);
            alert('Could not create the PDF. Please try again.');
        } finally {
            setIsDownloadingPdf(false);
        }
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
                    <div className="bg-white rounded-full h-4 w-64 mx-auto overflow-hidden border border-amber-200 mb-2">
                        <div className="bg-amber-500 h-full transition-all duration-1000" style={{ width: `${Math.min(100, (responses / required) * 100)}%` }}/>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                        {responses} / {required} Responses
                    </p>
                </div>
            ) : !isPro ? (
                <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm mt-8">
                    <div className="w-16 h-16 bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock size={32} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-[var(--umbil-text)]">Unlock Your Colleague Feedback Report</h3>
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
            ) : (
                <div className="space-y-8 mt-4 animate-in fade-in duration-300">
                    <div className="flex justify-between items-end mb-2 gap-3 flex-wrap">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--umbil-text)]">Final Report & Analytics</h2>
                            <p className="text-[var(--umbil-muted)] mt-1">Detailed feedback analysis for this MSF cycle.</p>
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

                    <div className="bg-[var(--umbil-brand-teal)]/10 border border-[var(--umbil-brand-teal)]/20 rounded-xl p-6 shadow-sm flex items-start gap-4">
                        <div className="mt-1 p-2 bg-[var(--umbil-brand-teal)]/20 text-[var(--umbil-brand-teal)] rounded-lg shrink-0">
                            <Zap size={20} className={generatingAi ? "animate-pulse" : ""} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h3 className="text-sm font-bold text-[var(--umbil-brand-teal)] uppercase tracking-wider">Appraisal-Ready Summary</h3>
                              {executiveSummary ? (
                                <button
                                  type="button"
                                  onClick={() => navigator.clipboard.writeText(executiveSummary)}
                                  className="btn btn--outline text-xs bg-[var(--umbil-surface)] px-2 py-1 flex items-center gap-1"
                                >
                                  <Copy size={12} /> Copy
                                </button>
                              ) : null}
                            </div>
                            {generatingAi && !executiveSummary ? (
                                <p className="text-[var(--umbil-brand-teal)]/70 text-sm animate-pulse">Analysing colleague feedback into appraisal evidence...</p>
                            ) : (
                                <p className="text-[var(--umbil-text)] text-sm leading-relaxed">{executiveSummary || "Generate an appraisal pack to create a copyable summary."}</p>
                            )}
                        </div>
                    </div>

                    {(pack.strengths.length > 0 || pack.developmentThemes.length > 0 || generatingAi) && (
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
                            <p className="text-sm text-[var(--umbil-muted)] italic">{generatingAi ? "Extracting themes…" : "No themes yet."}</p>
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
                            <p className="text-sm text-[var(--umbil-muted)] italic">{generatingAi ? "Extracting themes…" : "No themes yet."}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {pack.gmcMapping && (
                      <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-[var(--umbil-brand-teal)] uppercase tracking-wide mb-3">GMC Domain Mapping</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="flex justify-between gap-2 border-b border-[var(--umbil-divider)] pb-2"><span>Domain 1: Knowledge, Skills & Performance</span><strong>{pack.gmcMapping.domain1}</strong></div>
                          <div className="flex justify-between gap-2 border-b border-[var(--umbil-divider)] pb-2"><span>Domain 2: Safety & Quality</span><strong>{pack.gmcMapping.domain2}</strong></div>
                          <div className="flex justify-between gap-2 border-b border-[var(--umbil-divider)] pb-2"><span>Domain 3: Communication & Teamwork</span><strong>{pack.gmcMapping.domain3}</strong></div>
                          <div className="flex justify-between gap-2 border-b border-[var(--umbil-divider)] pb-2"><span>Domain 4: Maintaining Trust</span><strong>{pack.gmcMapping.domain4}</strong></div>
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

                    <ReflectionPanel
                        ref={reflectionRef}
                        value={reflection}
                        onChange={(html) => {
                            setReflectionSaved(false);
                            setReflection(html);
                        }}
                        onSaveReflection={() => void saveReflection()}
                        isSavingReflection={isSavingReflection}
                        reflectionSaved={reflectionSaved}
                        onSave={handleSaveToLog}
                        isSaving={isSavingLog}
                    />
                </div>
            )}
            <StreakPopup
              isOpen={isStreakPopupOpen}
              streakCount={streakToDisplay}
              milestone={milestoneToDisplay}
              onClose={() => setIsStreakPopupOpen(false)}
            />
        </div>
    );
}
