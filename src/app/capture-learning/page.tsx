// src/app/capture-learning/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { addCPD, CPDEntry } from "@/lib/store";
import Link from "next/link";
import { Sparkles, Wand2, Loader2 } from "lucide-react"; 
import ProUpgradeModal from "@/components/ProUpgradeModal";
import { HelpMeReflectModal } from "@/components/HelpMeReflectModal";
import { supabase } from "@/lib/supabase";
import type { GuidedReflectionAnswers } from "@umbil/shared";

const GMC_CLUSTERS = [
  "Knowledge Skills & Performance", 
  "Safety & Quality",
  "Communication Partnership & Teamwork",
  "Maintaining Trust",
];

export default function CaptureLearningPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [reflection, setReflection] = useState("");
  const [isOptionalOpen, setIsOptionalOpen] = useState(false);

  // Pro Modal State
  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proFeatureName, setProFeatureName] = useState("");

  // AI States
  const [isGenerating, setIsGenerating] = useState<string | null>(null); // 'guided_reflection' | 'personalise' | null
  const [isReflectOpen, setIsReflectOpen] = useState(false);
  const [reflectResetNonce, setReflectResetNonce] = useState(0);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  // Optional Fields
  const [tags, setTags] = useState("");
  const [duration, setDuration] = useState(10);

  // Context now includes conversationId
  const [cpdContext, setCpdContext] = useState<{ 
    question: string; 
    answer: string;
    conversationId?: string | null 
  } | null>(null);

  useEffect(() => {
    // Load context passed from the Dashboard
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('umbil_cpd_context');
      if (stored) {
        try {
          setCpdContext(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse CPD context", e);
        }
      }
    }
  }, []);

  // Toggle logic for tags (both GMC and suggested)
  const toggleTag = (tagToToggle: string) => {
    let tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);

    // Case-insensitive check to avoid duplicates like "Cardiology" and "cardiology"
    const existingIndex = tagList.findIndex(t => t.toLowerCase() === tagToToggle.toLowerCase());

    if (existingIndex > -1) {
        // Deselect: Remove the tag
        tagList.splice(existingIndex, 1);
    } else {
        // Select: Add the tag
        tagList.push(tagToToggle);
    }
    
    setTags(tagList.join(", "));
  };

  // --- AI ACTIONS ---

  const streamReflection = async (
    mode: "guided_reflection" | "personalise",
    extra: Record<string, unknown> = {}
  ) => {
    setIsGenerating(mode);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch("/api/generate-reflection", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
            },
            body: JSON.stringify({
                mode,
                userNotes: reflection,
                context: cpdContext,
                ...extra,
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            if (response.status === 403 || errData.error === "LIMIT_REACHED" || errData.error?.includes("LIMIT_REACHED")) {
                setProFeatureName(mode === "guided_reflection" ? "AI Reflections" : "AI Grammar Tidy");
                setIsProModalOpen(true);
                setIsGenerating(null);
                return false;
            }
            throw new Error("No response body");
        }
        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let streamedText = "";

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value, { stream: !done });
            streamedText += chunkValue;
            setReflection(streamedText);
        }
        return true;
    } catch (err) {
        console.error(err);
        alert("Failed to generate text. Please try again.");
        return false;
    } finally {
        setIsGenerating(null);
    }
  };

  const handleFixGrammar = async () => {
    if (!reflection.trim()) return;
    await streamReflection("personalise");
  };

  const handleGuidedSubmit = async (answers: GuidedReflectionAnswers) => {
    if (
      reflection.trim() &&
      !window.confirm(
        "Replace your current reflection with a structured version of these answers? You can still edit it afterwards."
      )
    ) {
      return;
    }
    const ok = await streamReflection("guided_reflection", { prompts: answers });
    if (ok) {
      setIsReflectOpen(false);
      setReflectResetNonce((n) => n + 1);
    }
  };

  // 2. Generate Tags (Called when opening structure)
  const generateTags = async () => {
    // Only generate if we haven't already and there is some content
    if (suggestedTags.length > 0 || (!reflection && !cpdContext)) return;

    setLoadingTags(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch("/api/generate-reflection", {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` })
            },
            body: JSON.stringify({
                mode: 'generate_tags',
                userNotes: reflection,
                context: cpdContext
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            if (response.status === 403 || errData.error === "LIMIT_REACHED" || errData.error?.includes("LIMIT_REACHED")) {
                setProFeatureName("AI Tag Generation");
                setIsProModalOpen(true);
                setLoadingTags(false);
                return;
            }
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let resultText = "";

        if (reader) {
            let done = false;
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                resultText += decoder.decode(value, { stream: !done });
            }
        }

        // Parse result: "Tag1, Tag2, Tag3" -> Array
        const newTags = resultText
            .split(",")
            .map(t => t.trim())
            .filter(t => t.length > 0);

        setSuggestedTags(newTags);

    } catch (e) {
        console.error("Failed to generate tags", e);
    } finally {
        setLoadingTags(false);
    }
  };

  const handleToggleStructure = () => {
    const newState = !isOptionalOpen;
    setIsOptionalOpen(newState);
    if (newState) {
        generateTags();
    }
  };

  // --- SAVE LOGIC ---
  const handleSave = async () => {
    if (!reflection.trim()) return;
    setLoading(true);

    try {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      
      const entry: Omit<CPDEntry, 'id' | 'user_id'> = {
        timestamp: new Date().toISOString(),
        question: cpdContext?.question || "Manual Entry",
        answer: cpdContext?.answer || "",
        reflection: reflection,
        tags: tagList,
        duration: duration
      };

      const { error } = await addCPD(entry);

      if (error) {
        if (error.message?.includes("LIMIT_REACHED") || JSON.stringify(error).includes("LIMIT_REACHED")) {
            setProFeatureName("Learning Log Saves");
            setIsProModalOpen(true);
            setLoading(false);
            return;
        }
        alert("Failed to save learning. Please try again.");
        setLoading(false);
      } else {
        const returnUrl = cpdContext?.conversationId 
            ? `/dashboard?c=${cpdContext.conversationId}&cpdSaved=true`
            : `/dashboard?cpdSaved=true`;

        sessionStorage.removeItem('umbil_cpd_context');
        router.push(returnUrl);
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred.");
      setLoading(false);
    }
  };

  const cancelHref = cpdContext?.conversationId 
    ? `/dashboard?c=${cpdContext.conversationId}` 
    : "/dashboard";

  return (
    <div style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: 'var(--umbil-bg)' }}>
      {/* NEW PRO MODAL INTEGRATION */}
      <ProUpgradeModal 
        isOpen={isProModalOpen} 
        onClose={() => setIsProModalOpen(false)} 
        featureName={proFeatureName} 
      />
      <HelpMeReflectModal
        isOpen={isReflectOpen}
        onClose={() => setIsReflectOpen(false)}
        initialLearned={reflection}
        sourceQuestion={cpdContext?.question ?? ""}
        resetNonce={reflectResetNonce}
        isSubmitting={isGenerating === "guided_reflection"}
        onSubmit={(answers) => { void handleGuidedSubmit(answers); }}
      />
      <div className="container" style={{ maxWidth: '700px', paddingTop: '60px', paddingBottom: '80px', color: 'var(--umbil-foreground)' }}>
        
       
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px', lineHeight: 1.2 }}>
            Capture what you&apos;ve just learned.
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--umbil-muted)' }}>
            Saved privately. Use later for study, training, or appraisal.
          </p>
 
        </div>

        {/* AI Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
             <button
                onClick={() => setIsReflectOpen(true)}
                disabled={!!isGenerating}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 12px', borderRadius: '8px',
                    border: '1px solid var(--umbil-card-border)',
                    background: 'var(--umbil-surface)',
                    color: 'var(--umbil-brand-teal)',
                    fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer',
                }}
             >
                {isGenerating === 'guided_reflection' ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16} />}
                Help me reflect
             </button>

             <button
                onClick={() => { void handleFixGrammar(); }}
                disabled={!!isGenerating || !reflection}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 12px', borderRadius: '8px',
                    border: '1px solid var(--umbil-card-border)',
                    background: 'var(--umbil-surface)',
                    color: 'var(--umbil-text)',
                    fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer',
                    opacity: !reflection ? 0.6 : 1
                }}
             >
                {isGenerating === 'personalise' ? <Loader2 size={16} className="animate-spin"/> : <Wand2 size={16} />}
                Fix grammar & flow
             </button>
        </div>

        {/* Primary Input */}
        <div style={{ marginBottom: '24px' }}>
          <textarea
            className="form-control"
         
            placeholder="What did you learn or discuss?"
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            style={{ 
              minHeight: '160px', 
              fontSize: '1.1rem', 
              padding: '20px',
              resize: 'vertical',
  
              boxShadow: 'var(--umbil-shadow-sm)',
              borderRadius: '12px',
              fontFamily: 'inherit',
              background: 'var(--umbil-input-bg, transparent)', 
              color: 'var(--umbil-foreground)',
              borderColor: 'var(--umbil-border)'
          
            }}
            autoFocus
          />
        </div>

        {/* Primary Action */}
        <button 
          className="btn btn--primary" 
          onClick={handleSave}
          disabled={loading || !reflection.trim()}
          style={{ 
            width: '100%', 
            padding: '16px', 
            fontSize: '1.1rem', 
            marginBottom: '16px',
            borderRadius: '12px'
          }}
        >
   
           {loading ? "Saving..." : "Capture learning"}
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--umbil-muted)' }}>
            You can export this to FourteenFish, Turas, or any portfolio later.
          </p>
        </div>

        {/* Optional Structure Section */}
        <div style={{ borderTop: '1px solid var(--umbil-divider)', paddingTop: '24px' }}>
          <button 
            onClick={handleToggleStructure}
            style={{ 
              background: 'none', 
            
              border: 'none', 
              color: 'var(--umbil-brand-teal)', 
              fontWeight: 600, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
    
              gap: '8px',
              fontSize: '1rem',
              width: '100%'
            }}
          >
            {isOptionalOpen ? "− Hide details" : "+ Add structure (optional)"}
          </button>

          {isOptionalOpen && (
            <div className="animate-in fade-in zoom-in-95 duration-300" style={{ marginTop: '24px' }}>
              
              {/* Auto-Generated Tags Section */}
              { (suggestedTags.length > 0 || loadingTags) && (
                 <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label" style={{ color: 'var(--umbil-foreground)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                       Suggested Tags
                     
                       {loadingTags && <Loader2 size={14} className="animate-spin" style={{ color: 'var(--umbil-muted)' }}/>}
                    </label>
                    <div className="gmc-cluster-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {suggestedTags.map((tag) => {
                 
                        const currentTags = tags.split(",").map(t => t.trim().toLowerCase());
                        const isActive = currentTags.includes(tag.toLowerCase());
                        return (
                          <button 
                            key={tag} 
                            type="button"
               
                            onClick={() => toggleTag(tag)}
                            style={{
                                background: isActive ? 'var(--umbil-brand-teal)' : 'var(--umbil-tag-bg, #f0fdfa)',
                   
                                color: isActive ? '#fff' : 'var(--umbil-brand-teal)',
                                border: isActive ? '1px solid var(--umbil-brand-teal)' : '1px solid transparent',
                                padding: '4px 10px',
       
                                 borderRadius: '16px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
        
                                fontWeight: 500,
                                transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '4px'
    
                            }}
                          >
                            {isActive && <span>✓</span>}
                    
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                 </div>
              )}

              {/* GMC Domains */}
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--umbil-foreground)' }}>GMC Domain Tags</label>
                <div className="gmc-cluster-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {GMC_CLUSTERS.map((tag) => {
                    const currentTags = tags.split(",").map(t => t.trim());
                    const isActive = currentTags.includes(tag);
 
                    return (
                      <button 
                        key={tag} 
                        type="button"
        
                        onClick={() => toggleTag(tag)}
                        style={{
                            background: isActive ? 'var(--umbil-brand-teal)' : 'transparent',
                         
                            color: isActive ? '#fff' : 'var(--umbil-muted)',
                            border: isActive ? '1px solid var(--umbil-brand-teal)' : '1px dashed var(--umbil-divider)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
      
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                  
                      }}
                      >
                        {isActive ? `✓ ${tag}` : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tags Input */}
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--umbil-foreground)' }}>Additional Tags (comma-separated)</label>
               
                <input
                  type="text"
                  className="form-control"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., cardiology, guidelines"
     
                  style={{
                      background: 'var(--umbil-input-bg, transparent)',
                      color: 'var(--umbil-foreground)',
                      borderColor: 'var(--umbil-border)'
                 
                  }}
                />
              </div>

              {/* Time Spent */}
              <div className="form-group">
                 <label className="form-label" style={{ color: 'var(--umbil-foreground)' }}>Time Spent</label>
              
                 <select 
                    className="form-control"
                    value={duration} 
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    style={{
             
                        background: 'var(--umbil-input-bg, transparent)',
                        color: 'var(--umbil-foreground)',
                        borderColor: 'var(--umbil-border)'
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

            </div>
          )}
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
           <Link href={cancelHref} style={{ color: 'var(--umbil-muted)', fontSize: '0.9rem', textDecoration: 'underline' }}>
              Cancel and return to chat
           
           </Link>
        </div>

      </div>
    </div>
  );
}
