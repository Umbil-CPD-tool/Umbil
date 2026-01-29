// src/components/ReflectionModal.tsx
"use client";

import { useState, useEffect } from "react";

type ReflectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  // UPDATED: Now accepts duration
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

// NEW: Helper to strip markdown artifacts
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
  // NEW: State for duration (default 10 mins)
  const [duration, setDuration] = useState(10);
  
  // Default to 'personalise' so they are encouraged to write their own notes first
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
      setDuration(10); // Reset to 10 on open
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
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolType: "translate_reflection", input: reflection }),
      });

      if (!res.ok || !res.body) throw new Error("Translation failed");

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
    
    // Safety check for Personalise mode
    if (generationMode === 'personalise' && !reflection.trim()) {
      setError("Please type your rough notes first, then click Tidy Up.");
      return;
    }

    setIsGeneratingReflection(true);
    setError(null);
    setGeneratedTags([]);

    // Clear box only if Auto mode. 
    // In Personalise mode, we'll overwrite it with the stream, which feels natural.
    if (generationMode === 'auto') {
        setReflection("");
    }

    let fullText = ""; 

    try {
      const res = await fetch("/api/generate-reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: cpdEntry.question,
          answer: cpdEntry.answer,
          userNotes: reflection, 
          mode: generationMode,
        }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to start reflection stream");
      }

      // Clear for personalise mode right before stream starts
      if (generationMode === 'personalise') setReflection("");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        fullText += decoder.decode(value);
        
        // --- CLEAN MARKDOWN ON THE FLY ---
        // We clean the text before setting it to state
        let displayText = fullText;
        if (displayText.includes("---TAGS---")) {
           displayText = displayText.split("---TAGS---")[0];
        }
        
        // Clean markdown characters from the display text
        setReflection(cleanMarkdown(displayText)); 
      }

      // Final cleanup and tag parsing
      if (fullText.includes("---TAGS---")) {
        const parts = fullText.split("---TAGS---");
        setReflection(cleanMarkdown(parts[0])); // Ensure final result is clean
        
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
    // PASS DURATION
    onSave(reflection, tagList, duration);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" id={tourId}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Add Reflection to Learning Log</h3>
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
            <div style={{
                display: 'flex', 
                background: '#f1f5f9', 
                borderRadius: '8px', 
                padding: '4px',
                marginBottom: '10px'
            }}>
                <button
                    onClick={() => setGenerationMode('auto')}
                    style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
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
                        flex: 1,
                        padding: '8px',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        background: generationMode === 'personalise' ? 'white' : 'transparent',
                        color: generationMode === 'personalise' ? '#0f172a' : '#64748b',
                        boxShadow: generationMode === 'personalise' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                        transition: 'all 0.2s ease'
                    }}
                >
                    ✏️ Personalise
                </button>
            </div>
            <p style={{fontSize: '0.8rem', color: 'var(--umbil-muted)', marginTop: '4px'}}>
                {generationMode === 'auto' 
                  ? "Creates a full structured reflection (Learning, Application, Next Steps) based on the topic." 
                  : "Fixes grammar and flow of YOUR notes. Does NOT add extra headers or make things up."}
            </p>
        </div>

        <div className="form-group">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '6px'}}>
             <label className="form-label" style={{marginBottom:0}}>
                {generationMode === 'auto' ? 'Reflection Preview' : 'Your Notes'}
             </label>
             <button 
                onClick={handleTranslate} 
                className="action-button" 
                disabled={isTranslating || !reflection}
                title="Translate reflection to English for appraisal"
             >
                {isTranslating ? 'Translating...' : '🌍 Translate to English'}
             </button>
          </div>
          
          <textarea
            className="form-control"
            rows={8}
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder={
                generationMode === 'auto' 
                ? "Click 'Generate' to create a structured reflection..." 
                : "Type your rough notes here in any language (e.g. 'Discussed paraneoplastic syndromes, need to check Ca125'). \n\nWe'll tidy the grammar but keep your exact meaning."
            }
            disabled={isGeneratingReflection || isTranslating}
          />
        </div>

        <div className="generate-button-container">
          <button
            className="generate-button"
            onClick={handleGenerateReflection}
            disabled={isGeneratingReflection || !cpdEntry}
          >
            {isGeneratingReflection ? (
              "Working..."
            ) : (
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
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>Learning Time:</span>
           </div>
           <select 
              value={duration} 
              onChange={(e) => setDuration(parseInt(e.target.value))}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', color: '#0f172a' }}
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

        <div className="flex justify-end mt-4">
          <button onClick={handleSave} className="btn btn--primary">
            Save to Learning Log
          </button>
        </div>
      </div>
    </div>
  );
}