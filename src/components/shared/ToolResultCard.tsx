// src/components/shared/ToolResultCard.tsx
"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ToolId } from "@/components/ToolsModal";
import styles from "./ToolResultCard.module.css";

const Icons = {
  Edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Copy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  Print: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>,
  Globe: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg>,
};

const stripMarkdown = (md: string) => {
  if (!md) return "";
  return md
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s+(.*)/gm, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
};

const convertMdToHtml = (md: string) => {
  return md
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.*?)\*/g, "<i>$1</i>")
    .replace(/## (.*)/g, "<h2>$1</h2>")
    .replace(/\* (.*)/g, "<li>$1</li>")
    .replace(/\n/g, "<br/>");
};

export type ToolResultCardProps = {
  toolId: ToolId;
  output: string;
  onOutputChange: (value: string) => void;
  loading: boolean;
  isEditing: boolean;
  onEditingChange: (value: boolean) => void;
  translatedOutput: string;
  isTranslating: boolean;
  recentLanguages: string[];
  onTranslate: (language: string) => void | Promise<void>;
  onToast?: (message: string) => void;
  className?: string;
};

export const ToolResultCard = ({
  toolId,
  output,
  onOutputChange,
  loading,
  isEditing,
  onEditingChange,
  translatedOutput,
  isTranslating,
  recentLanguages,
  onTranslate,
  onToast,
  className,
}: ToolResultCardProps) => {
  const [showTranslateModal, setShowTranslateModal] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("");

  const handleCopy = () => {
    let textToCopy = translatedOutput
      ? `--- ENGLISH ---\n\n${output}\n\n--- TRANSLATION ---\n\n${translatedOutput}`
      : output;

    textToCopy = stripMarkdown(textToCopy);

    navigator.clipboard.writeText(textToCopy);
    onToast?.("Copied to clipboard");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      onToast?.("Pop-up blocked");
      return;
    }

    const englishHtml = convertMdToHtml(output);
    const translatedHtml = translatedOutput ? convertMdToHtml(translatedOutput) : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Patient Handout - Umbil</title>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 40px; 
              max-width: ${translatedOutput ? "1000px" : "800px"}; 
              margin: 0 auto; 
              color: #333;
              line-height: 1.6;
            }
            .grid-container {
              display: grid;
              grid-template-columns: ${translatedOutput ? "1fr 1fr" : "1fr"};
              gap: 40px;
            }
            h2 { 
              color: #005eb8; 
              border-bottom: 2px solid #eee;
              padding-bottom: 10px;
              margin-top: 30px;
              font-size: 1.4rem;
            }
            b { color: #222; font-weight: 700; }
            li { margin-bottom: 8px; }
            .footer {
              margin-top: 50px;
              font-size: 0.8rem;
              color: #888;
              border-top: 1px solid #eee;
              padding-top: 20px;
              text-align: center;
              grid-column: 1 / -1;
            }
          </style>
        </head>
        <body>
          <h1 style="font-size: 1.8rem; margin-bottom: 5px;">Information for you</h1>
          <p style="color: #666; margin-top: 0;">Created on ${new Date().toLocaleDateString()}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          
          <div class="grid-container">
            <div>
                ${translatedOutput ? '<h3 style="color:#666; font-size: 1rem;">English</h3>' : ""}
                ${englishHtml}
            </div>
            ${translatedOutput ? `
            <div>
                <h3 style="color:#666; font-size: 1rem;">Translated</h3>
                ${translatedHtml}
            </div>` : ""}
          </div>

          <div class="footer">
            This information is for guidance. If your symptoms worsen, please contact your GP or NHS 111.
          </div>
          <script>
            window.onload = () => { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const requestTranslate = (lang: string) => {
    if (!lang.trim()) return;
    setShowTranslateModal(false);
    onTranslate(lang);
  };

  const rootClassName = className ? `${styles.root} ${className}` : styles.root;

  return (
    <div className={rootClassName}>
      {showTranslateModal && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.4)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "0 0 12px 12px",
        }}>
          <div style={{
            backgroundColor: "var(--umbil-surface)", padding: "24px",
            borderRadius: "12px", width: "90%", maxWidth: "400px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h4 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                {Icons.Globe} Translate Handout
              </h4>
              <button
                onClick={() => setShowTranslateModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--umbil-muted)" }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <label className="form-label" style={{ fontSize: "0.85rem" }}>Target Language</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g., Spanish, Urdu, Polish..."
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              style={{ marginBottom: "16px" }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") requestTranslate(targetLanguage);
              }}
            />

            {recentLanguages.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <span style={{ fontSize: "0.75rem", color: "var(--umbil-muted)", display: "block", marginBottom: "8px" }}>Recently Used:</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {recentLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => { setTargetLanguage(lang); requestTranslate(lang); }}
                      style={{
                        padding: "4px 12px", fontSize: "0.8rem", borderRadius: "16px",
                        border: "1px solid var(--umbil-divider)", backgroundColor: "var(--umbil-bg)",
                        cursor: "pointer", color: "var(--umbil-text)",
                      }}
                      className="hover:border-teal-400"
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              className="btn btn btn--primary"
              style={{ width: "100%", padding: "10px" }}
              onClick={() => requestTranslate(targetLanguage)}
              disabled={!targetLanguage.trim()}
            >
              Translate
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <label className="form-label" style={{ marginBottom: 0 }}>Result</label>

        {output && !loading && (
          <div className="flex gap-3">
            {toolId === "patient_friendly" && !isEditing && (
              <button
                onClick={() => setShowTranslateModal(true)}
                className="action-button"
                title="Translate to another language"
                style={{ color: "var(--umbil-brand-teal)" }}
              >
                {Icons.Globe} Translate
              </button>
            )}

            {toolId === "patient_friendly" && (
              <button
                onClick={handlePrint}
                className="action-button"
                title="Print Patient Handout"
              >
                {Icons.Print} Print
              </button>
            )}

            <button
              onClick={() => onEditingChange(!isEditing)}
              className="action-button"
              style={{ color: isEditing ? "var(--umbil-brand-teal)" : "var(--umbil-muted)" }}
            >
              {isEditing ? Icons.Check : Icons.Edit}
              {isEditing ? "Done" : "Refine"}
            </button>
            <button onClick={handleCopy} className="action-button">
              {Icons.Copy} Copy
            </button>
          </div>
        )}
      </div>

      <div
        className="form-control"
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--umbil-surface)",
          border: "none",
          padding: 0,
          minHeight: isEditing ? "360px" : 0,
          position: "relative",
        }}
      >
        {loading ? (
          <div style={{ padding: "4px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="skeleton-loader" style={{ height: "20px", width: "80%" }}></div>
            <div className="skeleton-loader" style={{ height: "20px", width: "95%" }}></div>
            <div className="skeleton-loader" style={{ height: "20px", width: "90%" }}></div>
            <div className="skeleton-loader" style={{ height: "20px", width: "60%", marginTop: "12px" }}></div>
          </div>
        ) : output ? (
          isEditing ? (
            <textarea
              value={output}
              onChange={(e) => onOutputChange(e.target.value)}
              style={{
                width: "100%",
                minHeight: "360px",
                height: "100%",
                flex: 1,
                boxSizing: "border-box",
                border: "1px dashed var(--umbil-brand-teal)",
                borderRadius: "8px",
                padding: "12px",
                outline: "none",
                fontSize: "0.95rem",
                fontFamily: "inherit",
                lineHeight: "1.6",
                backgroundColor: "var(--umbil-bg)",
                color: "var(--umbil-text)",
                resize: "vertical",
              }}
            />
          ) : (
            toolId === "referral" ? (
              <div style={{
                whiteSpace: "pre-wrap",
                fontFamily: "inherit",
                lineHeight: "1.6",
                color: "var(--umbil-text)",
                overflowY: "auto",
                padding: "0 4px 24px 4px",
                height: "100%",
              }}>
                {output}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: translatedOutput || isTranslating ? "1fr 1fr" : "1fr", gap: "24px", flex: 1, minHeight: 0 }}>
                <div className="markdown-content-wrapper" style={{
                  overflowY: "auto",
                  height: "100%",
                  paddingRight: translatedOutput || isTranslating ? "24px" : "8px",
                  paddingLeft: "4px",
                  paddingBottom: "24px",
                  borderRight: translatedOutput || isTranslating ? "1px solid var(--umbil-divider)" : "none",
                }}>
                  {translatedOutput && (
                    <div style={{
                      position: "sticky",
                      top: 0,
                      background: "var(--umbil-surface)",
                      zIndex: 10,
                      paddingBottom: "8px",
                      paddingTop: "4px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--umbil-muted)",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                      English
                    </div>
                  )}
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                </div>

                {(translatedOutput || isTranslating) && (
                  <div className="markdown-content-wrapper" style={{
                    overflowY: "auto",
                    height: "100%",
                    paddingRight: "8px",
                    paddingLeft: "4px",
                    paddingBottom: "24px",
                  }}>
                    <div style={{
                      position: "sticky",
                      top: 0,
                      background: "var(--umbil-surface)",
                      zIndex: 10,
                      paddingBottom: "8px",
                      paddingTop: "4px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--umbil-brand-teal)",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}>
                      Translated
                    </div>
                    {isTranslating ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "16px" }}>
                        <div className="skeleton-loader" style={{ height: "16px", width: "80%" }}></div>
                        <div className="skeleton-loader" style={{ height: "16px", width: "95%" }}></div>
                        <div className="skeleton-loader" style={{ height: "16px", width: "90%" }}></div>
                      </div>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{translatedOutput}</ReactMarkdown>
                    )}
                  </div>
                )}
              </div>
            )
          )
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--umbil-muted)", opacity: 0.5, flexDirection: "column", gap: "8px" }}>
            <span style={{ fontSize: "0.9rem" }}>Output will appear here</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolResultCard;
