// src/app/cpd/page.tsx
"use client";

import { useEffect, useState } from "react";
import { CPDEntry, getAllLogs, getCpdTags, getMatchingLogs, deleteCPD, updateCPD } from "@/lib/store"; 
import { useUserEmail } from "@/hooks/useUserEmail";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import cpdStyles from './cpd.module.css';
import { useCpdExport } from "@/hooks/useCpdExport";

const PAGE_SIZE = 10;
const DEFAULT_DURATION = 10; // 10 Minutes

function CPDInner() {
  const [entries, setEntries] = useState<CPDEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [tag, setTag] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // New Hook Usage
  const { 
    isExporting, 
    downloadCSV, 
    printCPD, 
    downloadSinglePDF, 
    downloadSelectedZip 
  } = useCpdExport();

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = q.trim();
      setDebouncedQ((prev) => {
        if (prev !== next) setCurrentPage(0);
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    void getCpdTags().then(setAllTags);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      const { data, error, count } = await getAllLogs({
        page: currentPage,
        pageSize: PAGE_SIZE,
        search: debouncedQ,
        tag,
      });
      if (!cancelled && !error) {
        setEntries(data);
        setTotalCount(count);
      }
      if (!cancelled) setLoading(false);
    };
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [currentPage, debouncedQ, tag]);

  useEffect(() => {
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAllPage = () => {
      const newSet = new Set(selectedIds);
      const allSelected = entries.every(e => e.id && newSet.has(e.id));
      
      entries.forEach(e => {
          if (!e.id) return;
          if (allSelected) newSet.delete(e.id);
          else newSet.add(e.id);
      });
      setSelectedIds(newSet);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    setDeletingId(id);
    await deleteCPD(id);
    const { data, error, count } = await getAllLogs({
      page: currentPage,
      pageSize: PAGE_SIZE,
      search: debouncedQ,
      tag,
    });
    if (!error) {
      setEntries(data);
      setTotalCount(count);
      if (data.length === 0 && currentPage > 0) setCurrentPage(currentPage - 1);
    }
    setDeletingId(null);
    if (selectedIds.has(id)) {
        const newSet = new Set(selectedIds);
        newSet.delete(id);
        setSelectedIds(newSet);
    }
  };

  const handleUpdateDuration = async (id: string, minutesStr: string) => {
    const mins = parseInt(minutesStr);
    setEntries(prev => prev.map(item => 
        item.id === id ? { ...item, duration: mins } : item
    ));
    await updateCPD(id, { duration: mins });
  };

  return (
    <section className="main-content">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: '10px' }}>
          {totalCount > 0 && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn--outline" onClick={() => void getMatchingLogs({ search: debouncedQ, tag }).then(printCPD)}>Export Learning Log</button>
              <button className="btn btn--outline" onClick={() => void getMatchingLogs({ search: debouncedQ, tag }).then(downloadCSV)}>📥 Download CSV</button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="filters" style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          <input className="form-control" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="form-control" value={tag} onChange={(e) => { setTag(e.target.value); setCurrentPage(0); }}>
            <option value="">All tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
            <div style={{ 
                position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', 
                backgroundColor: '#1e293b', color: 'white', padding: '12px 24px', 
                borderRadius: '50px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                display: 'flex', gap: '16px', alignItems: 'center', zIndex: 100 
            }}>
                <span style={{ fontWeight: 600 }}>{selectedIds.size} selected</span>
                <button 
                    onClick={() => downloadSelectedZip(entries, selectedIds)} 
                    disabled={isExporting}
                    className="btn"
                    style={{ backgroundColor: '#0e7490', color: 'white', border: 'none', padding: '6px 16px', fontSize: '0.9rem' }}
                >
                    {isExporting ? 'Bundling...' : 'Download Selected (Zip)'}
                </button>
                <button 
                    onClick={() => setSelectedIds(new Set())}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}
                >
                    &times;
                </button>
            </div>
        )}

        {/* Select All Checkbox */}
        {totalCount > 0 && (
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                 <input 
                    type="checkbox" 
                    checked={entries.length > 0 && entries.every(e => e.id && selectedIds.has(e.id))}
                    onChange={toggleSelectAllPage}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                 />
                 <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Select all on page</span>
            </div>
        )}

        <div className={cpdStyles.cpdEntries}>
          {loading && <p>Loading entries...</p>}
          {!loading && entries.map((e, idx) => {
             const currentMinutes = e.duration || DEFAULT_DURATION;
             const isSelected = e.id ? selectedIds.has(e.id) : false;
             
             return (
              <div key={e.id || idx} className={cpdStyles.cpdCard} style={isSelected ? { border: '1px solid #0e7490', backgroundColor: '#ecfeff' } : {}}>
                <div className={cpdStyles.card__body}>
                  <div style={{ marginBottom: 16, borderBottom: '1px solid var(--umbil-divider)', paddingBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                         {e.id && (
                             <input 
                                type="checkbox" 
                                checked={isSelected} 
                                onChange={() => toggleSelection(e.id!)}
                                style={{ width: 18, height: 18, cursor: 'pointer', marginRight: 8, accentColor: '#0e7490' }}
                             />
                         )}

                         <div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--umbil-muted)' }}>{new Date(e.timestamp).toLocaleString()}</div>
                         </div>
                         
                         <div className={cpdStyles.timeSelectorWrapper}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--umbil-teal)' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <select 
                                className={cpdStyles.timeSelect}
                                value={currentMinutes}
                                onChange={(ev) => e.id && handleUpdateDuration(e.id, ev.target.value)}
                            >
                                <option value="5">5 min</option>
                                <option value="10">10 min</option>
                                <option value="15">15 min</option>
                                <option value="30">30 min</option>
                                <option value="45">45 min</option>
                                <option value="60">1 hr</option>
                                <option value="90">1.5 hrs</option>
                                <option value="120">2 hrs</option>
                            </select>
                         </div>
                    </div>

                    {e.id && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                title="Export as PDF" 
                                className={cpdStyles.btnDelete} 
                                style={{ color: '#0e7490', borderColor: '#cffafe', backgroundColor: '#ecfeff' }}
                                onClick={() => downloadSinglePDF(e)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                            </button>

                            <button title="Delete entry" disabled={deletingId === e.id} className={cpdStyles.btnDelete} onClick={() => handleDelete(e.id!)}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                        </div>
                    )}
                  </div>

                  <div style={{ fontWeight: 600, marginBottom: 12, fontSize: '1.1rem', color: 'var(--umbil-text)' }}>{e.question}</div>
                  
                  <div style={{ fontSize: '0.9rem' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{e.answer}</ReactMarkdown>
                  </div>
                  {e.reflection && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--umbil-divider)', fontStyle: 'italic', color: 'var(--umbil-muted)', fontSize: '0.9rem' }}>
                      <strong>Reflection:</strong>
                      <div>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{e.reflection}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: 12 }}>
                    {(e.tags || []).map((t) => (
                      <span key={t} style={{ marginRight: 8, padding: '4px 8px', borderRadius: 12, backgroundColor: 'var(--umbil-hover-bg)', fontSize: '0.8rem', color: 'var(--umbil-text)', fontWeight: 500 }}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button className="btn btn--outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>Previous</button>
                <span>Page {currentPage + 1} of {totalPages}</span>
                <button className="btn btn--outline" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>Next</button>
            </div>
        )}
      </div>
    </section>
  );
}

export default function CPDPage() {
  const { email, loading } = useUserEmail();
  if (loading) return null;
  if (!email) return <div className="container">Please sign in.</div>;
  return <CPDInner />;
}