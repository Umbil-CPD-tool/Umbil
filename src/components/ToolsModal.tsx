// src/components/ToolsModal.tsx
"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Toast from "./Toast";
import { supabase } from "@/lib/supabase"; // Import Supabase client
import styles from "./ToolsModal.module.css";

// Export the Type so HomeContent can use it
export type ToolId = 'referral' | 'safety_netting' | 'discharge_summary' | 'sbar' | 'patient_friendly';
export type ReferralMode = 'quick' | 'detailed';

interface ToolConfig {
  id: ToolId;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  desc: string;
}

// Interface matches the Supabase table structure
interface HistoryItem {
  id: string;
  tool_id: string;
  tool_name: string;
  input: string;
  output: string;
  created_at: string;
}

const Icons = {
  Referral: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
  Shield: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Sbar: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
  Discharge: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M10 13h4"/><path d="M12 11v4"/></svg>,
  Patient: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>,
  History: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Edit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  Check: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Copy: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
};

export const TOOLS_CONFIG: ToolConfig[] = [
  { 
    id: 'referral', 
    label: 'Referral Writer', 
    icon: Icons.Referral, 
    placeholder: "e.g., 54F. 3 weeks hoarse voice. Smoker. Exam: Neck normal. Request ENT 2WW.", 
    desc: "Drafts a professional GP referral letter from shorthand notes." 
  },
  { 
    id: 'safety_netting', 
    label: 'Safety Netting', 
    icon: Icons.Shield, 
    placeholder: "e.g., 3yo child, fever 38.5, drinking ok, no rash. Viral URTI.", 
    desc: "Generates medico-legal advice and specific red flags for the patient." 
  },
  { 
    id: 'patient_friendly', 
    label: 'Patient Translator', 
    icon: Icons.Patient, 
    placeholder: "Paste discharge summary, diagnosis, or complex medical notes here...", 
    desc: "Rewrites complex medical text into simple, patient-friendly language." 
  },
  { 
    id: 'sbar', 
    label: 'SBAR Handover', 
    icon: Icons.Sbar, 
    placeholder: "e.g., 78M, Bay 4. BP 80/50, Sats 88%. Peri-arrest. Need Reg review.", 
    desc: "Structured situation-background-assessment-recommendation for urgent calls." 
  },
  { 
    id: 'discharge_summary', 
    label: 'Discharge Condenser', 
    icon: Icons.Discharge, 
    placeholder: "Paste the long list of daily ward rounds here...", 
    desc: "Extracts diagnosis, med changes, and follow-up from messy notes." 
  },
];

type ToolsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTool?: ToolId;
};

export default function ToolsModal({ isOpen, onClose, initialTool = 'referral' }: ToolsModalProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // New State Features
  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // V3 Referral Features
  const [referralMode, setReferralMode] = useState<ReferralMode>('detailed');

  // User Signature State
  const [signerProfile, setSignerProfile] = useState<{name: string | null, role: string | null} | null>(null);

  const activeTool = TOOLS_CONFIG.find(t => t.id === initialTool) || TOOLS_CONFIG[0];

  // Fetch User Profile on Mount
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         const { data } = await supabase.from('profiles').select('full_name, grade').eq('id', user.id).single();
         if (data) {
            setSignerProfile({ name: data.full_name, role: data.grade });
         }
      }
    };
    fetchProfile();
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInput("");
      setOutput("");
      setIsEditing(false);
      setShowHistory(false);
      // Reset mode on open if desired, or keep last state
      setReferralMode('detailed');
    }
  }, [isOpen, initialTool]);

  // Fetch History from Supabase
  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('tool_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5); // Get last 5 items

    if (!error && data) {
      setHistory(data as HistoryItem[]);
    }
    setLoadingHistory(false);
  };

  // Toggle History View
  const toggleHistory = () => {
    if (!showHistory) {
      fetchHistory();
    }
    setShowHistory(!showHistory);
  };

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutput("");
    setIsEditing(false);
    setShowHistory(false);

    let fullText = "";

    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          toolType: activeTool.id, 
          input,
          // Pass User Signature Data
          signerName: signerProfile?.name,
          signerRole: signerProfile?.role,
          // Pass Referral Mode (V3)
          referralMode
        }),
      });

      if (!res.ok || !res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setOutput((prev) => prev + chunk);
      }
      
      // Save to Supabase (Cross-Platform)
      // We rely on RLS 'default auth.uid()' in SQL to handle user_id
      await supabase.from('tool_history').insert([
        { 
          tool_id: activeTool.id,
          tool_name: activeTool.label,
          input: input,
          output: fullText 
        }
      ]);

    } catch (e) {
      console.error(e);
      setOutput("⚠️ Error generating content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setToastMessage("Copied to clipboard");
  };

  const restoreHistoryItem = (item: HistoryItem) => {
    setInput(item.input);
    setOutput(item.output);
    setShowHistory(false);
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <Toast 
        message={toastMessage} 
        onClose={() => setToastMessage(null)} 
      />

      <div className={`modal-content ${styles.content}`}>
        
        {/* Header */}
        <div className={styles.header}>
          <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
             <div style={{ color: 'var(--umbil-brand-teal)' }}>{activeTool.icon}</div>
             <div>
               <h3 style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.2 }}>{activeTool.label}</h3>
               <p style={{ fontSize: '0.85rem', color: 'var(--umbil-muted)', fontWeight: 400 }}>{activeTool.desc}</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleHistory}
              className="action-button"
              style={{ marginRight: '16px', color: showHistory ? 'var(--umbil-brand-teal)' : 'var(--umbil-muted)' }}
              title="Recent Generations"
            >
              {Icons.History}
              <span style={{ fontSize: '0.9rem' }}>Recent</span>
            </button>
            
            <button onClick={onClose} className="close-button" style={{ position: 'static' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <div className={styles.body}>
          {/* HISTORY VIEW */}
          {showHistory ? (
             <div className={styles.main} style={{ padding: '24px' }}>
                <h4 className="form-label">Recent Generations</h4>
                {loadingHistory ? (
                  <div className="flex flex-col gap-3 mt-4">
                     <div className="skeleton-loader h-12 w-full"></div>
                     <div className="skeleton-loader h-12 w-full"></div>
                  </div>
                ) : history.length === 0 ? (
                  <p style={{ color: 'var(--umbil-muted)', fontSize: '0.9rem', marginTop: '12px' }}>No recent history found.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                    {history.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => restoreHistoryItem(item)}
                        style={{ 
                          padding: '16px', 
                          border: '1px solid var(--umbil-divider)', 
                          borderRadius: '8px',
                          cursor: 'pointer',
                          backgroundColor: 'var(--umbil-surface)',
                          transition: 'all 0.2s'
                        }}
                        className="hover:border-teal-400 hover:shadow-sm"
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--umbil-brand-teal)' }}>{item.tool_name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--umbil-muted)' }}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--umbil-text)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {item.output.slice(0, 60)}...
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          ) : (
            /* MAIN TOOL VIEW */
            <div className={styles.main}>
              
              {/* Input Section */}
              <div className={styles.inputSection}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Clinical Notes</label>
                    
                    {/* V3 Referral Toggle */}
                    {activeTool.id === 'referral' && (
                      <div className="referral-mode-toggle" style={{ display: 'flex', background: 'var(--umbil-bg-subtle)', borderRadius: '6px', padding: '2px', border: '1px solid var(--umbil-border)' }}>
                        <button
                          onClick={() => setReferralMode('quick')}
                          style={{
                            padding: '4px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: referralMode === 'quick' ? 'white' : 'transparent',
                            color: referralMode === 'quick' ? 'var(--umbil-brand-teal)' : 'var(--umbil-muted)',
                            boxShadow: referralMode === 'quick' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Quick
                        </button>
                        <button
                          onClick={() => setReferralMode('detailed')}
                          style={{
                            padding: '4px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: referralMode === 'detailed' ? 'white' : 'transparent',
                            color: referralMode === 'detailed' ? 'var(--umbil-brand-teal)' : 'var(--umbil-muted)',
                            boxShadow: referralMode === 'detailed' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          Detailed
                        </button>
                      </div>
                    )}
                  </div>

                  {input && (
                    <button 
                      onClick={() => setInput("")} 
                      className="action-button" 
                      style={{ fontSize: '0.8rem', gap: '4px' }}
                    >
                      {Icons.Trash} Clear
                    </button>
                  )}
                </div>
                
                <textarea
                  className="form-control"
                  style={{ 
                      height: '140px', 
                      resize: 'none', 
                      fontSize: '0.95rem',
                      backgroundColor: 'var(--umbil-bg)',
                      border: '1px solid var(--umbil-divider)',
                      fontFamily: 'inherit'
                  }}
                  placeholder={activeTool.placeholder}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                />
                
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button 
                    className="btn btn--primary" 
                    onClick={handleGenerate} 
                    disabled={loading || !input.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px' }}
                  >
                    {loading ? 'Working...' : <>Generate <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2z"/></svg></>}
                  </button>
                </div>
              </div>

              {/* Output Section */}
              <div className={styles.outputSection}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label className="form-label" style={{marginBottom:0}}>Result</label>
                  
                  {/* Result Actions */}
                  {output && !loading && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setIsEditing(!isEditing)} 
                        className="action-button"
                        style={{ color: isEditing ? 'var(--umbil-brand-teal)' : 'var(--umbil-muted)' }}
                      >
                         {isEditing ? Icons.Check : Icons.Edit} 
                         {isEditing ? 'Done' : 'Refine'}
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
                    overflowY: 'auto', 
                    backgroundColor: 'var(--umbil-surface)',
                    border: 'none',
                    padding: 0,
                    minHeight: '200px',
                    position: 'relative'
                  }}
                >
                  {loading ? (
                    // Skeleton Loading State
                    <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="skeleton-loader" style={{ height: '20px', width: '80%' }}></div>
                      <div className="skeleton-loader" style={{ height: '20px', width: '95%' }}></div>
                      <div className="skeleton-loader" style={{ height: '20px', width: '90%' }}></div>
                      <div className="skeleton-loader" style={{ height: '20px', width: '60%', marginTop: '12px' }}></div>
                    </div>
                  ) : output ? (
                    isEditing ? (
                      // Edit Mode: Textarea
                      <textarea 
                        value={output}
                        onChange={(e) => setOutput(e.target.value)}
                        style={{
                          width: '100%',
                          height: '100%',
                          border: '1px dashed var(--umbil-brand-teal)',
                          borderRadius: '8px',
                          padding: '12px',
                          outline: 'none',
                          fontSize: '0.95rem',
                          fontFamily: 'inherit',
                          backgroundColor: 'var(--umbil-bg)',
                          resize: 'none'
                        }}
                      />
                    ) : (
                      // Display Mode: Formatted
                      // Treat 'patient_friendly' like 'referral' (plain text, no markdown)
                      (activeTool.id === 'referral' || activeTool.id === 'patient_friendly') ? (
                        <div style={{ 
                          whiteSpace: 'pre-wrap', 
                          fontFamily: 'inherit',
                          lineHeight: '1.6',
                          color: 'var(--umbil-text)'
                        }}>
                          {output}
                        </div>
                      ) : (
                        <div className="markdown-content-wrapper">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{output}</ReactMarkdown>
                        </div>
                      )
                    )
                  ) : (
                    // Empty State
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--umbil-muted)', opacity: 0.5, flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '0.9rem' }}>Output will appear here</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}