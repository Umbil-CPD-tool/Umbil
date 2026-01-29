// src/app/cpd/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { CPDEntry, getAllLogs, deleteCPD, updateCPD } from "@/lib/store"; 
import { useUserEmail } from "@/hooks/useUser";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderToStaticMarkup } from "react-dom/server";
import cpdStyles from './cpd.module.css';
import { pdf } from '@react-pdf/renderer';
import { CpdPdfDocument } from "@/components/CpdPdfDocument";
import JSZip from "jszip";

const PAGE_SIZE = 10;
const DEFAULT_DURATION = 10; // 10 Minutes

// Helper for cleaning text for file names
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')           // Replace spaces with _
    .replace(/[^\w-]+/g, '')       // Remove all non-word chars
    .replace(/--+/g, '_')           // Replace multiple - with single _
    .substring(0, 50);              // Limit length
};

function cleanForCSV(text: string): string {
  if (!text) return "";
  let clean = text;
  clean = clean.replace(/^\|?[\s-]+\|[\s-]+\|?$/gm, ""); 
  clean = clean.replace(/\|/g, " - "); 
  clean = clean.replace(/\*\*/g, ""); 
  clean = clean.replace(/__/g, "");
  clean = clean.replace(/\*/g, "");
  clean = clean.replace(/^#{1,6}\s+(.*$)/gm, (match, p1) => `\n[${p1.toUpperCase()}]`);
  clean = clean.replace(/^\s*[-*]\s+/gm, "• ");
  clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  clean = clean.replace(/\n{3,}/g, "\n\n");
  return clean.trim();
}

function toCSV(rows: CPDEntry[]) {
  const BOM = "\uFEFF"; 
  const header = ["Date", "Learning Activity", "Description", "Reflection", "GMC Domain", "Credits", "Tags"];
  
  const body = rows.map((r) => {
    const q = cleanForCSV(r.question || "");
    const a = cleanForCSV(r.answer || "");
    const refl = cleanForCSV(r.reflection || "");
    const t = (r.tags || []).join("; ");
    
    const tagString = t.toLowerCase();
    let domain = "Knowledge, Skills & Performance";
    if (tagString.includes("safety") || tagString.includes("quality")) domain = "Safety & Quality";
    else if (tagString.includes("communication") || tagString.includes("teamwork")) domain = "Communication, Partnership & Teamwork";
    else if (tagString.includes("trust")) domain = "Maintaining Trust";

    const mins = r.duration || DEFAULT_DURATION;
    const credits = mins / 60;

    return [
      new Date(r.timestamp).toLocaleDateString(),
      `"${q.replace(/"/g, '""')}"`,
      `"${a.replace(/"/g, '""')}"`,
      `"${refl.replace(/"/g, '""')}"`,
      `"${domain}"`,
      `"${credits.toFixed(2)}"`,
      `"${t.replace(/"/g, '""')}"`,
    ].join(",");
  });

  return BOM + [header.join(","), ...body].join("\n");
}

function CPDInner() {
  const [allEntries, setAllEntries] = useState<CPDEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await getAllLogs();
      if (!error) {
        setAllEntries(data);
        setAllTags(Array.from(new Set(data.flatMap((e) => e.tags || []))).sort());
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredEntries = useMemo(() => {
    return allEntries.filter((e) => {
      const matchesSearch = !q || (
        (e.question || "").toLowerCase().includes(q.toLowerCase()) ||
        (e.answer || "").toLowerCase().includes(q.toLowerCase()) ||
        (e.reflection || "").toLowerCase().includes(q.toLowerCase())
      );
      const matchesTag = !tag || (e.tags || []).includes(tag);
      return matchesSearch && matchesTag;
    });
  }, [allEntries, q, tag]);

  const paginatedList = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredEntries.slice(start, start + PAGE_SIZE);
  }, [filteredEntries, currentPage]);

  const totalCount = filteredEntries.length;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  useEffect(() => { setCurrentPage(0); }, [q, tag]);

  const downloadCSV = () => {
    const csvContent = toCSV(filteredEntries);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Umbil_Learning_Log_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printCPD = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert("Please allow popups to print your learning log.");
        return;
    }

    const groupedData: Record<string, CPDEntry[]> = {
        "Knowledge, Skills & Performance": [],
        "Safety & Quality": [],
        "Communication, Partnership & Teamwork": [],
        "Maintaining Trust": []
    };

    filteredEntries.forEach(e => {
        const t = (e.tags || []).join(" ").toLowerCase();
        let d = "Knowledge, Skills & Performance";
        if (t.includes("safety") || t.includes("quality")) d = "Safety & Quality";
        else if (t.includes("communication") || t.includes("teamwork")) d = "Communication, Partnership & Teamwork";
        else if (t.includes("trust")) d = "Maintaining Trust";
        groupedData[d].push(e);
    });

    let domainSectionsHtml = "";
    let totalCredits = 0;

    Object.entries(groupedData).forEach(([domain, entries]) => {
        if (entries.length === 0) return;
        
        let sectionCredits = 0;
        entries.forEach(e => {
             const mins = e.duration || DEFAULT_DURATION;
             sectionCredits += (mins / 60);
        });
        totalCredits += sectionCredits;

        domainSectionsHtml += `
            <div class="domain-header">
                <h2>${domain}</h2>
                <div class="domain-meta">${entries.length} Activities • ${sectionCredits.toFixed(2)} Credits</div>
            </div>
        `;

        entries.forEach(e => {
            const answerHtml = renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]}>{e.answer || ""}</ReactMarkdown>);
            const reflectionHtml = e.reflection ? renderToStaticMarkup(<ReactMarkdown remarkPlugins={[remarkGfm]}>{e.reflection}</ReactMarkdown>) : "";
            
            const mins = e.duration || DEFAULT_DURATION;
            const entryCredits = mins / 60;

            domainSectionsHtml += `
                <div class="entry">
                    <div class="entry-meta">
                        <span class="date">${new Date(e.timestamp).toLocaleDateString()}</span>
                        <span class="credit-tag">${entryCredits.toFixed(2)} Credits (${mins}m)</span>
                    </div>
                    <div class="question">${e.question}</div>
                    <div class="answer markdown-body">${answerHtml}</div>
                    ${reflectionHtml ? `<div class="reflection"><div class="reflection-label">Reflection</div>${reflectionHtml}</div>` : ''}
                </div>
            `;
        });
    });

    const htmlContent = `
      <html>
        <head>
          <title>Medical Appraisal Portfolio - ${new Date().toLocaleDateString()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; max-width: 900px; margin: 0 auto; line-height: 1.6; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #0f172a; margin: 0; font-size: 24px; }
            .subtitle { color: #64748b; font-size: 14px; margin-top: 5px; }
            .dashboard { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 40px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .stat-box { text-align: center; }
            .stat-val { display: block; font-size: 28px; font-weight: 700; color: #0e7490; }
            .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
            .domain-header { margin-top: 40px; margin-bottom: 20px; border-bottom: 2px solid #0e7490; padding-bottom: 5px; display: flex; justify-content: space-between; align-items: baseline; }
            .domain-header h2 { font-size: 18px; color: #0e7490; margin: 0; }
            .domain-meta { font-size: 12px; color: #64748b; font-weight: 600; }
            .entry { margin-bottom: 25px; page-break-inside: avoid; border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; background: white; }
            .entry-meta { display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
            .date { font-weight: 600; font-size: 13px; color: #64748b; }
            .credit-tag { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; border: 1px solid #bae6fd; }
            .question { font-weight: 700; font-size: 16px; margin-bottom: 10px; color: #0f172a; }
            .markdown-body { font-size: 14px; color: #334155; }
            .markdown-body table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; table-layout: fixed; }
            .markdown-body th, .markdown-body td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; word-break: break-word; }
            .markdown-body th { background-color: #f1f5f9; font-weight: 600; }
            .reflection { background: #f0fdf4; border-left: 3px solid #16a34a; padding: 12px 15px; border-radius: 0 4px 4px 0; margin-top: 15px; }
            .reflection-label { font-weight: 700; color: #166534; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
            .reflection p { margin: 0; font-style: italic; color: #14532d; font-size: 14px; }
            .print-btn { display: none; }
            @media print { 
                body { padding: 0; } 
                .no-print { display: none; }
                .entry { box-shadow: none; border: 1px solid #94a3b8; }
                .dashboard { border: 1px solid #94a3b8; }
                .credit-tag, .reflection, .dashboard, .markdown-body th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
             <h1>Annual Appraisal Portfolio</h1>
             <div class="subtitle">Learning Log • Generated by Umbil</div>
          </div>
          
          <div class="dashboard">
             <div class="stat-box">
                <span class="stat-val">${filteredEntries.length}</span>
                <span class="stat-label">Total Activities</span>
             </div>
             <div class="stat-box">
                <span class="stat-val">${totalCredits.toFixed(2)}</span>
                <span class="stat-label">Total Hours</span>
             </div>
          </div>

          <div class="no-print" style="text-align: center; margin-bottom: 30px; background: #fff7ed; padding: 10px; border: 1px solid #ffedd5; border-radius: 6px; color: #c2410c; font-size: 14px;">
             ℹ️ <strong>Tip:</strong> This PDF is grouped by GMC Domain for easy upload to <strong>Turas</strong>, SOAR, FourteenFish, or Clarity. 
             <br/>Press Cmd+P / Ctrl+P to save.
          </div>

          ${domainSectionsHtml}
          
          <script>
            window.onload = function() { setTimeout(() => window.print(), 500); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const downloadSinglePDF = async (entry: CPDEntry) => {
    if (!entry.id) return;
    try {
        const blob = await pdf(<CpdPdfDocument entry={entry} />).toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const dateStr = new Date(entry.timestamp).toISOString().split('T')[0];
        const titleSlug = slugify(entry.question || "Entry");
        a.download = `${dateStr}_${titleSlug}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("PDF Generation Error", err);
        alert("Failed to generate PDF. Please try again.");
    }
  };

  const downloadSelectedZip = async () => {
    if (selectedIds.size === 0) return;
    setIsExporting(true);
    try {
        const zip = new JSZip();
        const selectedEntries = allEntries.filter(e => e.id && selectedIds.has(e.id));
        
        for (const entry of selectedEntries) {
            const blob = await pdf(<CpdPdfDocument entry={entry} />).toBlob();
            const dateStr = new Date(entry.timestamp).toISOString().split('T')[0];
            const titleSlug = slugify(entry.question || "Entry");
            
            let fileName = `${dateStr}_${titleSlug}.pdf`;
            let counter = 1;
            while (zip.file(fileName)) {
                fileName = `${dateStr}_${titleSlug}_v${counter}.pdf`;
                counter++;
            }
            zip.file(fileName, blob);
        }

        const zipContent = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipContent);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Umbil_Portfolio_Bundle_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error("Zip Generation Error", err);
        alert("Failed to create export bundle.");
    } finally {
        setIsExporting(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const toggleSelectAllPage = () => {
      const newSet = new Set(selectedIds);
      const allSelected = paginatedList.every(e => e.id && newSet.has(e.id));
      
      paginatedList.forEach(e => {
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
    setAllEntries(prev => prev.filter(item => item.id !== id));
    setDeletingId(null);
    if (selectedIds.has(id)) {
        const newSet = new Set(selectedIds);
        newSet.delete(id);
        setSelectedIds(newSet);
    }
  };

  const handleUpdateDuration = async (id: string, minutesStr: string) => {
    const mins = parseInt(minutesStr);
    setAllEntries(prev => prev.map(item => 
        item.id === id ? { ...item, duration: mins } : item
    ));
    await updateCPD(id, { duration: mins });
  };

  return (
    <section className="main-content">
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: '10px' }}>
          <h2>My Learning Log</h2>
          {totalCount > 0 && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn--outline" onClick={printCPD}>Export Learning Log</button>
              <button className="btn btn--outline" onClick={downloadCSV}>📥 Download CSV</button>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="filters" style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          <input className="form-control" placeholder="Search..." value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="form-control" value={tag} onChange={(e) => setTag(e.target.value)}>
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
                    onClick={downloadSelectedZip} 
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
                    checked={paginatedList.length > 0 && paginatedList.every(e => e.id && selectedIds.has(e.id))}
                    onChange={toggleSelectAllPage}
                    style={{ width: 16, height: 16, cursor: 'pointer' }}
                 />
                 <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Select all on page</span>
            </div>
        )}

        <div className={cpdStyles.cpdEntries}>
          {loading && <p>Loading entries...</p>}
          {!loading && paginatedList.map((e, idx) => {
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