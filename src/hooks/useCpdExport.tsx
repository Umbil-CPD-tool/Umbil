"use client";

import { useState } from "react";
import { CPDEntry } from "@/lib/store";
import { pdf } from '@react-pdf/renderer';
import { CpdPdfDocument } from "@/components/CpdPdfDocument";
import JSZip from "jszip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

const DEFAULT_DURATION = 10;

// --- HELPERS ---

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '_')
    .substring(0, 50);
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

// --- HOOK ---

export function useCpdExport() {
  const [isExporting, setIsExporting] = useState(false);

  const downloadCSV = (entries: CPDEntry[]) => {
    const csvContent = toCSV(entries);
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

  const printCPD = (entries: CPDEntry[]) => {
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

    entries.forEach(e => {
        const t = (e.tags || []).join(" ").toLowerCase();
        let d = "Knowledge, Skills & Performance";
        if (t.includes("safety") || t.includes("quality")) d = "Safety & Quality";
        else if (t.includes("communication") || t.includes("teamwork")) d = "Communication, Partnership & Teamwork";
        else if (t.includes("trust")) d = "Maintaining Trust";
        groupedData[d].push(e);
    });

    let domainSectionsHtml = "";
    let totalCredits = 0;

    Object.entries(groupedData).forEach(([domain, domainEntries]) => {
        if (domainEntries.length === 0) return;
        
        let sectionCredits = 0;
        domainEntries.forEach(e => {
             const mins = e.duration || DEFAULT_DURATION;
             sectionCredits += (mins / 60);
        });
        totalCredits += sectionCredits;

        domainSectionsHtml += `
            <div class="domain-header">
                <h2>${domain}</h2>
                <div class="domain-meta">${domainEntries.length} Activities • ${sectionCredits.toFixed(2)} Credits</div>
            </div>
        `;

        domainEntries.forEach(e => {
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
                <span class="stat-val">${entries.length}</span>
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

  const downloadSelectedZip = async (allEntries: CPDEntry[], selectedIds: Set<string>) => {
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

  return {
    isExporting,
    downloadCSV,
    printCPD,
    downloadSinglePDF,
    downloadSelectedZip
  };
}