// src/components/ToolsModal.tsx
"use client";

import { useState, useEffect } from "react";
import Toast from "@/components/Toast";
import ProUpgradeModal from "@/components/ProUpgradeModal";
import { ToolResultCard } from "@/components/tools/ToolResultCard";
import { supabase } from "@/lib/supabase"; 
import { saveDraft, getDraft, clearDraft } from "@/lib/store";
import { analyzeTriageInput, type TriageAnalysis } from "@/lib/digital-triage";
import { TOOLS_CONFIG } from "@/lib/tools/config";
import type { ChatToolId, ReferralMode } from "@/lib/tools/types";
import styles from "./ToolsModal.module.css";

export type { ChatToolId as ToolId, ReferralMode } from "@/lib/tools/types";
export { TOOLS_CONFIG } from "@/lib/tools/config";

interface HistoryItem {
  id: string;
  tool_id: string;
  tool_name: string;
  input: string;
  output: string;
  created_at: string;
}

const Icons = {
  History: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
};

type ToolsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTool?: ChatToolId;
};

export default function ToolsModal({ isOpen, onClose, initialTool = 'referral' }: ToolsModalProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proFeatureName, setProFeatureName] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [referralMode, setReferralMode] = useState<ReferralMode>('detailed');

  const [translatedOutput, setTranslatedOutput] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [recentLanguages, setRecentLanguages] = useState<string[]>([]);
  const [triageMeta, setTriageMeta] = useState<TriageAnalysis | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [signerProfile, setSignerProfile] = useState<{name: string | null, role: string | null} | null>(null);

  const activeTool = TOOLS_CONFIG.find(t => t.id === initialTool) || TOOLS_CONFIG[0];

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
         setCurrentUserId(user.id);
         const { data } = await supabase
            .from('profiles')
            .select('full_name, grade, recent_languages')
            .eq('id', user.id)
            .single();
            
         if (data) {
            setSignerProfile({ name: data.full_name, role: data.grade });
            if (data.recent_languages && Array.isArray(data.recent_languages)) {
                setRecentLanguages(data.recent_languages);
            }
         }
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setOutput("");
      setTranslatedOutput("");
      setIsEditing(false);
      setShowHistory(false);
      setReferralMode('detailed');
      setTriageMeta(null);

      const load = async () => {
        try {
          const savedDraft = await getDraft(activeTool.id);
          if (savedDraft) {
            setInput(savedDraft);
          } else {
            setInput(""); 
          }
        } catch (err) {
          console.error("Failed to load draft", err);
          setInput("");
        }
      };
      load();
    }
  }, [isOpen, initialTool, activeTool.id]);

  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setTimeout(() => {
      saveDraft(activeTool.id, input);
    }, 1000);

    return () => clearTimeout(timer);
  }, [input, activeTool.id, isOpen]);


  const fetchHistory = async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from('tool_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setHistory(data as HistoryItem[]);
    }
    setLoadingHistory(false);
  };

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
    setTranslatedOutput("");
    setIsEditing(false);
    setShowHistory(false);
    setTriageMeta(
      activeTool.id === "digital_triage" ? analyzeTriageInput(input) : null
    );

    let fullText = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({ 
          toolType: activeTool.id, 
          input,
          signerName: signerProfile?.name,
          signerRole: signerProfile?.role,
          referralMode
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 || errData.error === "LIMIT_REACHED" || errData.error?.includes("LIMIT_REACHED")) {
          setProFeatureName(activeTool.label);
          setIsProModalOpen(true);
          setLoading(false);
          return;
        }
        throw new Error("Failed");
      }
      if (!res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setOutput((prev) => prev + chunk);
      }
      
      await supabase.from('tool_history').insert([
        { 
          tool_id: activeTool.id,
          tool_name: activeTool.label,
          input: input,
          output: fullText 
        }
      ]);

      await clearDraft(activeTool.id);

    } catch (e) {
      console.error(e);
      setOutput("⚠️ Error generating content. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (langToUse: string) => {
    if (!output.trim() || !langToUse.trim()) return;
    
    setIsTranslating(true);
    setTranslatedOutput("");

    const newRecents = Array.from(new Set([langToUse, ...recentLanguages])).slice(0, 5);
    setRecentLanguages(newRecents);
    
    if (currentUserId) {
        supabase
          .from('profiles')
          .update({ recent_languages: newRecents })
          .eq('id', currentUserId)
          .then(({ error }) => {
              if (error) console.error("Failed to save language preference:", error);
          });
    }

    let fullText = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({ 
          toolType: 'translate_handout', 
          input: output,
          targetLanguage: langToUse
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 || errData.error === "LIMIT_REACHED" || errData.error?.includes("LIMIT_REACHED")) {
          setProFeatureName("AI Translation");
          setIsProModalOpen(true);
          setIsTranslating(false);
          return;
        }
        throw new Error("Failed");
      }
      if (!res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setTranslatedOutput((prev) => prev + chunk);
      }
      
    } catch (e) {
      console.error(e);
      setTranslatedOutput("⚠️ Error translating content. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const restoreHistoryItem = (item: HistoryItem) => {
    setInput(item.input);
    setOutput(item.output);
    setTranslatedOutput("");
    setShowHistory(false);
    setIsEditing(false);
    setTriageMeta(
      item.tool_id === "digital_triage" ? analyzeTriageInput(item.input) : null
    );
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <Toast 
        message={toastMessage} 
        onClose={() => setToastMessage(null)} 
      />

      <ProUpgradeModal 
        isOpen={isProModalOpen} 
        onClose={() => setIsProModalOpen(false)} 
        featureName={proFeatureName} 
      />

      <div className={`modal-content ${styles.content}`}>
        
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

        <div className={styles.body} style={{ position: 'relative' }}>
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
            <div className={styles.main}>
              
              <div className={styles.inputSection}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <label className="form-label" style={{ marginBottom: 0 }}>Clinical Notes</label>
                    
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

              <ToolResultCard
                toolId={activeTool.id}
                output={output}
                onOutputChange={setOutput}
                loading={loading}
                isEditing={isEditing}
                onEditingChange={setIsEditing}
                translatedOutput={translatedOutput}
                isTranslating={isTranslating}
                recentLanguages={recentLanguages}
                onTranslate={handleTranslate}
                onToast={setToastMessage}
                triageMeta={activeTool.id === "digital_triage" ? triageMeta : null}
              />

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
