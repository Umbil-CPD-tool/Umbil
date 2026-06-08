// src/components/ReflectionModal.tsx
"use client";

import { useState, useEffect } from "react";
import ProUpgradeModal from "./ProUpgradeModal";
import { supabase } from "@/lib/supabase";

type ReflectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (reflection: string, tags: string[], duration: number) => void;
  currentStreak: number;
  cpdEntry: {
    question: string;
    answer: string;
  } | null;
  tourId?: string;
};

const GMC_CLUSTERS = [
  "Knowledge Skills & Performance", 
  "Safety & Quality",
  "Communication Partnership & Teamwork",
  "Maintaining Trust",
];

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
};

// Helper to strip markdown artifacts
function cleanMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*/g, "")      // Remove bold (**)
    .replace(/__/g, "")        // Remove bold (__)
    .replace(/^#+\s/gm, "")    // Remove headers (# Header)
    .replace(/`/g, "")         // Remove code ticks
    .replace(/\[|\]/g, "")     // Remove brackets if needed
    .trim();
}

export default function ReflectionModal({
  isOpen,
  onClose,
  onSave,
  currentStreak,
  cpdEntry,
  tourId,
}: ReflectionModalProps) {
  const [reflection, setReflection] = useState("");
  const [tags, setTags] = useState(""); 
  const [duration, setDuration] = useState(10);
  
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proFeatureName, setProFeatureName] = useState("");
  const [generationMode, setGenerationMode] = useState<'auto' | 'personalise'>('personalise');

  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setReflection("");
      setTags("");
      setGeneratedTags([]);
      setError(null);
      setIsGeneratingReflection(false);
      setIsTranslating(false);
      setGenerationMode('personalise');
      setDuration(10); 
    }
  }, [isOpen]);

  const addTag = (tagToAdd: string) => {
    const tagList = tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    if (!tagList.includes(tagToAdd)) {
      setTags((prev) => (prev ? `${prev}, ${tagToAdd}` : tagToAdd));
    }
    setGeneratedTags(prev => prev.filter((t: string) => t !== tagToAdd));
  };

  const handleTranslate = async () => {
    if (!reflection.trim()) return;
    setIsTranslating(true);
    const originalText = reflection;
    let translatedText = "";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({ toolType: "translate_handout", input: reflection }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 || errData.error === "LIMIT_REACHED" || errData.error?.includes("LIMIT_REACHED")) {
          setProFeatureName("AI Translation");
          setIsProModalOpen(true);
          setIsTranslating(false);
          return;
        }
        throw new Error("Translation failed");
      }
      if (!res.body) throw new Error("Translation failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        translatedText += decoder.decode(value, { stream: true });
        setReflection(translatedText);
      }
      setReflection(prev => `${prev}\n\n--- Original Text ---\n${originalText}`);
    } catch {
      setError("Translation failed. Please try again.");
      setReflection(originalText);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleGenerateReflection = async () => {
    if (!cpdEntry) return;

    if (generationMode === 'personalise' && !reflection.trim()) {
      setError("Please type your rough notes first, then click Tidy Up.");
      return;
    }

    setIsGeneratingReflection(true);
    setError(null);
    setGeneratedTags([]);

    if (generationMode === 'auto') {
        setReflection("");
    }

    let fullText = ""; 

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/generate-reflection", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
        },
        body: JSON.stringify({
          question: cpdEntry.question,
          answer: cpdEntry.answer,
          userNotes: reflection, 
          mode: generationMode,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 403 || errData.error === "LIMIT_REACHED" || errData.error?.includes("LIMIT_REACHED")) {
          setProFeatureName(generationMode === 'auto' ? "AI Reflections" : "AI Grammar Tidy");
          setIsProModalOpen(true);
          setIsGeneratingReflection(false);
          return;
        }
        throw new Error(errData.error || "Failed to start reflection stream");
      }
      if (!res.body) throw new Error("Failed to start reflection stream");

      if (generationMode === 'personalise') setReflection("");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        fullText += decoder.decode(value);
        
        let displayText = fullText;
        if (displayText.includes("---TAGS---")) {
           displayText = displayText.split("---TAGS---")[0];
        }
        
        setReflection(cleanMarkdown(displayText));
      }

      if (fullText.includes("---TAGS---")) {
        const parts = fullText.split("---TAGS---");
        setReflection(cleanMarkdown(parts[0])); 
        
        const tagText = parts[1].trim();
        try {
          const parsedTags = JSON.parse(tagText);
          if (Array.isArray(parsedTags)) {
            const newTags = parsedTags.filter((t: string) => t);
            setGeneratedTags(newTags);
          }
        } catch {
          const fallbackTags = tagText.replace(/[\[\]"]/g, "").split(",").map((t) => t.trim()).filter(Boolean);
          setGeneratedTags(fallbackTags);
        }
      }
    } catch (err) {
      setError(`⚠️ ${getErrorMessage(err)}`);
    } finally {
      setIsGeneratingReflection(false);
    }
  };

  const handleSave = () => {
    const tagList = tags.split(",").map((t: string) => t.trim()).filter(Boolean);
    onSave(reflection, tagList, duration);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <ProUpgradeModal 
        isOpen={isProModalOpen} 
        onClose={() => setIsProModalOpen(false)} 
        featureName={proFeatureName} 
      />
      <div id={tourId} className="modal-content" style={{ padding: '24px', maxWidth: '600px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Learning Log</h3>
          <button onClick={onClose} className="close-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="streak-display-modal">
            <div>
                🔥 Learning streak: {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
            </div>
            <p style={{fontSize: '0.9rem', color: 'var(--umbil-muted)', fontWeight: 400, marginTop: '4px'}}>
                Consistency builds clarity - Keep your learning flow alive!
            </p>
        </div>

        {error && <p style={{ color: 'red', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</p>}
        
        {/* --- MODE SLIDER --- */}
        <div className="form-group">
            <label className="form-label">Mode</label>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '4px', marginBottom: '10px' }}>
                <button 
                    onClick={() => setGenerationMode('auto')}
                    style={{ 
                        flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                        background: generationMode === 'auto' ? 'white' : 'transparent',
                        color: generationMode === 'auto' ? '#0f172a' : '#64748b',
                        boxShadow: generationMode === 'auto' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    ⚡ Auto-Generate
                </button>
                <button 
                    onClick={() => setGenerationMode('personalise')}
                    style={{ 
                        flex: 1, padding: '8px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                        background: generationMode === 'personalise' ? 'white' : 'transparent',
                        color: generationMode === 'personalise' ? '#0f172a' : '#64748b',
                        boxShadow: generationMode === 'personalise' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    ✍️ Personalise (Edit)
                </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--umbil-muted)', marginBottom: '10px' }}>
                {generationMode === 'auto' 
                    ? "Let Umbil write a reflection based on your question and answer." 
                    : "Write rough notes and let Umbil format them professionally."}
            </p>
        </div>

        <div className="form-group" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '150px' }}>
          <label className="form-label">
              {generationMode === 'auto' ? "Generated Reflection" : "Your Reflection Notes"}
          </label>
          <div style={{ position: 'relative', flexGrow: 1 }}>
              <textarea
                className="form-control"
                placeholder={generationMode === 'auto' ? "Your reflection will appear here..." : "e.g., I learned that the first-line treatment is..."}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                style={{ 
                    height: '100%', 
                    minHeight: '120px', 
                    resize: 'none', 
                    fontFamily: 'inherit', 
                    lineHeight: '1.5',
                    paddingBottom: '40px' 
                }}
              />
              <button 
                  onClick={handleTranslate} 
                  disabled={isTranslating || !reflection.trim()}
                  title="Translate reflection to English"
                  style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'var(--umbil-surface)',
                      border: '1px solid var(--umbil-border)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      color: 'var(--umbil-muted)'
                  }}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                  {isTranslating ? "Translating..." : "Translate"}
              </button>
          </div>
        </div>

        <div className="generate-button-container">
            <button 
                className="btn btn--outline" 
                onClick={handleGenerateReflection} 
                disabled={isGeneratingReflection || (generationMode === 'personalise' && !reflection.trim())}
                style={{ width: '100%', justifyContent: 'center' }}
            >
                {isGeneratingReflection ? "Processing..." : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.9 5.8-5.8 1.9 5.8 1.9L12 18l1.9-5.8 5.8-1.9-5.8-1.9Z"></path></svg>
                        {generationMode === 'auto' ? "Auto-Generate Reflection" : "Tidy Up My Notes"}
                    </>
                )}
            </button>
        </div>

        <div className="form-group">
          <label className="form-label">GMC Domain Tags (Click to add)</label>
          <div className="gmc-cluster-container">
            {GMC_CLUSTERS.map((tag) => (
              <button key={tag} className="gmc-button" onClick={() => addTag(tag)}>
                + {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tags (comma-separated)</label>
          <input
            type="text"
            className="form-control"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., gynaecology, diabetes"
          />
          {generatedTags.length > 0 && (
            <>
              <div className="tag-button-container">
                {generatedTags.map((tag: string) => (
                  <button key={tag} className="tag-button" onClick={() => addTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
              <span className="auto-tag-label">Auto-generated tags (click to add)</span>
            </>
          )}
        </div>

        {/* NEW: Learning Time Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color:'#0d9488'}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Time Spent</span>
            </div>
            <select 
                value={duration} 
                onChange={(e) => setDuration(parseInt(e.target.value))}
                style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: 'white',
                    fontSize: '0.9rem',
                    color: '#0f172a',
                    cursor: 'pointer',
                    outline: 'none'
                }}
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

        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn--secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={handleSave} disabled={!reflection.trim()}>
            Save to Learning Log
          </button>
        </div>
      </div>
    </div>
  );
}
