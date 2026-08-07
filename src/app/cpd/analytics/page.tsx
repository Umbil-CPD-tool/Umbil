// src/app/cpd/analytics/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useUserEmail } from "@/hooks/useUserEmail";
import { getCPD, CPDEntry } from "@/lib/store";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  LineChart, 
  Line, 
  CartesianGrid,
  Cell
} from 'recharts';

// --- Constants ---
const GMC_DOMAINS = [
  "Knowledge Skills & Performance",
  "Safety & Quality",
  "Communication Partnership & Teamwork",
  "Maintaining Trust",
];

const DEFAULT_CREDITS = 0.25; // 15 mins per entry
const ANNUAL_TARGET = 50; // GMC Recommendation

type TimeFilter = 'week' | 'month' | 'year' | 'all';

// --- Helper Components for the Dashboard ---

// 1. Circular Progress Ring (Visual Flair)
const ProgressRing = ({ radius, stroke, progress }: { radius: number, stroke: number, progress: number }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: radius * 2, height: radius * 2 }}>
        <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
            <circle
                stroke="#e2e8f0"
                strokeWidth={stroke}
                fill="transparent"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
            <circle
                stroke="var(--umbil-brand-teal)"
                fill="transparent"
                strokeWidth={stroke}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
            />
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--umbil-brand-teal)' }}>
            {Math.round(progress)}%
        </div>
    </div>
  );
};

// 2. The Learning Advisor Logic
function getAdvisorMessage(totalCredits: number, thisMonthCount: number) {
    if (totalCredits === 0) return "Welcome to your CPD journey! Start by logging your first clinical question or reflection to get the ball rolling.";
    if (totalCredits >= ANNUAL_TARGET) return "Outstanding! You have hit the 50-hour target for the year. Focus now on quality reflections and ensuring all GMC domains are covered.";
    if (totalCredits >= ANNUAL_TARGET / 2) return "Great progress! You are over halfway to your annual target. Review your 'GMC Domain Coverage' below to ensure you have a balanced portfolio.";
    if (thisMonthCount > 4) return "You're building great momentum this month! Consistency is key. Try adding a 'Deep Dive' reflection to boost your credit hours.";
    return "You're off to a start. Aim for just 15 minutes (1 credit) a week to comfortably hit your appraisal target without the end-of-year panic.";
}

// --- Helper Functions ---

const mapToGmcDomain = (tag: string): string | null => {
  const t = tag.toLowerCase().trim();
  if (t.includes("knowledge") || t.includes("skills & performance") || t.includes("skills and performance")) return GMC_DOMAINS[0];
  if (t.includes("safety") || t.includes("quality")) return GMC_DOMAINS[1];
  if (t.includes("communication") || t.includes("partnership") || t.includes("teamwork")) return GMC_DOMAINS[2];
  if (t.includes("maintaining") || t.includes("trust")) return GMC_DOMAINS[3];
  return null; 
};

const filterDataByTime = (entries: CPDEntry[], filter: TimeFilter): CPDEntry[] => {
  const now = new Date();
  if (filter === 'all') return entries;
  const getStartDate = () => {
    const startDate = new Date(now);
    if (filter === 'week') startDate.setDate(now.getDate() - 7);
    else if (filter === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (filter === 'year') startDate.setFullYear(now.getFullYear() - 1);
    return startDate;
  };
  const startDate = getStartDate();
  return entries.filter(entry => new Date(entry.timestamp) >= startDate);
};

const processTagData = (entries: CPDEntry[]) => {
  const tagCounts: Record<string, number> = {};
  for (const entry of entries) {
    for (const tag of entry.tags || []) {
      const gmcMatch = mapToGmcDomain(tag);
      if (!gmcMatch) {
        const cleanTag = tag.trim();
        tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
      }
    }
  }
  return Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count) 
    .slice(0, 10); 
};

const processGmcData = (entries: CPDEntry[]) => {
  const gmcCounts: Record<string, number> = {
    [GMC_DOMAINS[0]]: 0, [GMC_DOMAINS[1]]: 0, [GMC_DOMAINS[2]]: 0, [GMC_DOMAINS[3]]: 0,
  };
  for (const entry of entries) {
    for (const tag of entry.tags || []) {
      const gmcMatch = mapToGmcDomain(tag);
      if (gmcMatch) gmcCounts[gmcMatch] = (gmcCounts[gmcMatch] || 0) + 1;
    }
  }
  return Object.entries(gmcCounts).map(([name, count]) => ({ domain: name, fullDomain: name, count: count }));
};

const processTimelineData = (entries: CPDEntry[]) => {
  const timelineMap: Record<string, number> = {};
  const toDateKey = (date: Date) => date.toISOString().split('T')[0];
  for (const entry of entries) {
    const dateKey = toDateKey(new Date(entry.timestamp));
    timelineMap[dateKey] = (timelineMap[dateKey] || 0) + 1;
  }
  return Object.entries(timelineMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RenderGmcTick = ({ payload, x, y, textAnchor, ...props }: any) => {
  const label = payload.value;
  let lines = [label];
  if (label.includes("Communication")) lines = ["Communication", "Partnership", "& Teamwork"];
  else if (label.includes("Knowledge")) lines = ["Knowledge Skills", "& Performance"];
  else if (label.includes("Safety")) lines = ["Safety", "& Quality"];
  else if (label.includes("Maintaining")) lines = ["Maintaining", "Trust"];

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={0} textAnchor={textAnchor} style={{ fill: 'var(--umbil-text)', fontSize: '10px', fontWeight: 600 }} {...props}>
        {lines.map((line, index) => <tspan x={0} dy={index === 0 ? 0 : 12} key={index}>{line}</tspan>)}
      </text>
    </g>
  );
};

// --- Main Analytics Component ---
function AnalyticsInner() {
  const [loading, setLoading] = useState(true);
  const [allEntries, setAllEntries] = useState<CPDEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const entries = await getCPD(); 
      setAllEntries(entries);
      setLoading(false);
    };
    fetchData();
  }, []);

  // --- Calculations for Top Dashboard ---
  // 1. Calculate Annual Credits (Current Calendar Year for simplicity, or last 12 months)
  const currentYear = new Date().getFullYear();
  const thisYearEntries = allEntries.filter(e => new Date(e.timestamp).getFullYear() === currentYear);
  const totalCredits = thisYearEntries.length * DEFAULT_CREDITS;
  const progressPercent = Math.min(100, (totalCredits / ANNUAL_TARGET) * 100);
  
  // 2. This Month Activity
  const currentMonth = new Date().getMonth();
  const thisMonthEntries = thisYearEntries.filter(e => new Date(e.timestamp).getMonth() === currentMonth);

  // 3. Top Domain
  const gmcStats = processGmcData(thisYearEntries);
  const topDomain = gmcStats.sort((a, b) => b.count - a.count)[0];

  // --- Calculations for Graphs ---
  const filteredData = useMemo(() => filterDataByTime(allEntries, timeFilter), [allEntries, timeFilter]);
  const tagData = useMemo(() => processTagData(filteredData), [filteredData]);
  const gmcDomainData = useMemo(() => processGmcData(filteredData), [filteredData]);
  const timelineData = useMemo(() => processTimelineData(filteredData), [filteredData]);

  if (loading) return <p>Loading analytics...</p>;

  // Custom Tooltip
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--umbil-surface)', border: '1px solid var(--umbil-divider)', padding: '8px 12px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ fontWeight: 600, color: 'var(--umbil-text)', marginBottom: '4px', fontSize: '0.9rem' }}>{label}</p>
          <p style={{ color: 'var(--umbil-brand-teal)', margin: 0, fontWeight: 700 }}>{payload[0].value} Entries</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* --- NEW: Learning Advisor Panel --- */}
      <div className="card" style={{ marginBottom: 24, borderLeft: '4px solid var(--umbil-brand-teal)', background: 'var(--umbil-surface)' }}>
         <div className="card__body" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>💡</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--umbil-text)' }}>Continuous Learning Advisor</h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--umbil-muted)', lineHeight: 1.5 }}>
                {getAdvisorMessage(totalCredits, thisMonthEntries.length)}
            </p>
         </div>
      </div>

      {/* --- NEW: Metric Cards Grid --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: 32 }}>
        
        {/* Card 1: Annual Progress */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', padding: '20px', gap: '16px' }}>
            <ProgressRing radius={36} stroke={6} progress={progressPercent} />
            <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--umbil-text)', lineHeight: 1 }}>{totalCredits}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--umbil-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: '4px' }}>
                    Hours Logged<br/>(Target: {ANNUAL_TARGET})
                </div>
            </div>
        </div>

        {/* Card 2: This Month */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
             <div style={{ fontSize: '0.85rem', color: 'var(--umbil-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                Entries This Month
             </div>
             <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--umbil-brand-teal)' }}>{thisMonthEntries.length}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--umbil-muted)' }}>entries</span>
             </div>
        </div>

        {/* Card 3: Top Domain */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
             <div style={{ fontSize: '0.85rem', color: 'var(--umbil-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>
                Strongest Area
             </div>
             <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--umbil-text)', lineHeight: 1.3 }}>
                {topDomain && topDomain.count > 0 ? topDomain.domain : "No data yet"}
             </div>
             {topDomain && topDomain.count > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--umbil-brand-teal)', marginTop: '4px' }}>
                    {topDomain.count} entries logged
                </div>
             )}
        </div>
      </div>

      {/* --- Existing Filters & Charts --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h3 style={{ margin: 0 }}>Detailed Analysis</h3>
        <div style={{ width: '160px' }}>
            <select className="form-control" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as TimeFilter)} style={{ fontSize: '0.9rem', padding: '6px' }}>
            <option value="all">All Time</option>
            <option value="year">Last Year</option>
            <option value="month">Last Month</option>
            <option value="week">Last Week</option>
            </select>
        </div>
      </div>

      {/* Chart Row 1: Topics & Domains */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: 24 }}>
          {/* Chart 1: Topics */}
          <div className="card">
            <div className="card__body" style={{ padding: '20px' }}>
            <h4 style={{ marginBottom: 16, fontSize: '1rem' }}>Top Clinical Topics</h4>
            {tagData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                <BarChart data={tagData} layout="vertical" margin={{ left: 5, right: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--umbil-divider)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} hide />
                    <YAxis type="category" dataKey="name" width={100} stroke="var(--umbil-text)" style={{ fontSize: '11px', fontWeight: 500 }} tickLine={false} />
                    <Tooltip cursor={{ fill: 'var(--umbil-hover-bg)' }} content={<CustomTooltip />} />
                    <Bar dataKey="count" fill="var(--umbil-brand-teal)" barSize={20} radius={[0, 4, 4, 0]}>
                        {tagData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index < 3 ? 'var(--umbil-brand-teal)' : 'var(--umbil-muted)'} fillOpacity={index < 3 ? 1 : 0.4} />
                        ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            ) : <p style={{color: 'var(--umbil-muted)', fontStyle: 'italic', fontSize: '0.9rem'}}>No clinical tags found.</p>}
            </div>
          </div>

          {/* Chart 2: Domains */}
          <div className="card">
            <div className="card__body" style={{ padding: '20px' }}>
            <h4 style={{ marginBottom: 16, fontSize: '1rem' }}>GMC Domain Balance</h4>
            <div style={{ height: 250, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={gmcDomainData}>
                    <PolarGrid stroke="var(--umbil-divider)" />
                    <PolarAngleAxis dataKey="domain" tick={<RenderGmcTick />} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar name="Entries" dataKey="count" stroke="var(--umbil-brand-teal)" fill="var(--umbil-brand-teal)" fillOpacity={0.5} />
                    <Tooltip content={<CustomTooltip />} />
                </RadarChart>
                </ResponsiveContainer>
            </div>
            </div>
          </div>
      </div>

      {/* Chart 3: Timeline */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card__body" style={{ padding: '20px' }}>
          <h4 style={{ marginBottom: 16, fontSize: '1rem' }}>Learning Frequency</h4>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData} margin={{ right: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--umbil-divider)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--umbil-muted)" 
                  style={{ fontSize: '11px' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(dateStr) => {
                    const date = new Date(dateStr);
                    return timeFilter === 'week' 
                        ? date.toLocaleDateString('en-GB', { weekday: 'short' })
                        : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                  }}
                />
                <YAxis allowDecimals={false} stroke="var(--umbil-muted)" style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" stroke="var(--umbil-brand-teal)" strokeWidth={3} dot={{ r: 4, fill: 'var(--umbil-surface)', stroke: 'var(--umbil-brand-teal)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p style={{color: 'var(--umbil-muted)', fontStyle: 'italic', fontSize: '0.9rem'}}>No activity data yet.</p>}
        </div>
      </div>
    </>
  );
}

export default function CPDAnalyticsPage() {
  const { email, loading } = useUserEmail();
  if (loading) return null; 
  if (!email) return <div className="card"><div className="card__body">Please sign in to view analytics.</div></div>;
  return <AnalyticsInner />;
}