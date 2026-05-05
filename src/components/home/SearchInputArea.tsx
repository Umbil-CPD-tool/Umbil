// src/components/home/SearchInputArea.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { ToolId, TOOLS_CONFIG } from "@/components/ToolsModal";

export type AnswerStyle = "clinic" | "standard" | "deepDive";

export const styleDisplayNames: Record<AnswerStyle, string> = { clinic: "Clinic", standard: "Standard", deepDive: "Deep Dive" };

export const ToolsDropdown: React.FC<{ onSelect: (toolId: ToolId) => void }> = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: ToolId) => { onSelect(id); setIsOpen(false); };
  
  return (
    <div id="tour-highlight-tools-dropdown" className="style-dropdown-container" ref={dropdownRef}>
      <button 
        className="action-icon-btn" 
        title="Medical Tools"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '1.1rem' }}>✨</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tools</span>
        </div>
      </button>
      
      {isOpen && (
        <div className="style-dropdown-menu" style={{ minWidth: '180px' }}>
          {TOOLS_CONFIG.map((tool) => (
             <button key={tool.id} onClick={() => handleSelect(tool.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{tool.label}</span>
             </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const AnswerStyleDropdown: React.FC<{ currentStyle: AnswerStyle; onStyleChange: (style: AnswerStyle) => void; }> = ({ currentStyle, onStyleChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (style: AnswerStyle) => { onStyleChange(style); setIsOpen(false); };
  
  return (
    <div id="tour-highlight-style-dropdown" className="style-dropdown-container" ref={dropdownRef}>
      <button className="style-dropdown-button" onClick={() => setIsOpen(!isOpen)} title="Change answer style">
        {styleDisplayNames[currentStyle]}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.7 }}><path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {isOpen && (
        <div className="style-dropdown-menu">
          <button className={currentStyle === "standard" ? "active" : ""} onClick={() => handleSelect("standard")}><strong>Standard</strong><p>Balanced, concise answer.</p></button>
          <button className={currentStyle === "clinic" ? "active" : ""} onClick={() => handleSelect("clinic")}><strong>Clinic</strong><p>Bullet points, rapid actions.</p></button>
          <button className={currentStyle === "deepDive" ? "active" : ""} onClick={() => handleSelect("deepDive")}><strong>Deep Dive</strong><p>Detailed evidence review.</p></button>
        </div>
      )}
    </div>
  );
};

export type SearchInputAreaProps = {
  q: string;
  setQ: (val: string) => void;
  ask: () => void;
  loading: boolean;
  isTourOpen: boolean;
  isRecording: boolean;
  handleMicClick: () => void;
  answerStyle: AnswerStyle;
  setAnswerStyle: (s: AnswerStyle) => void;
  onToolSelect: (id: ToolId) => void;
  handleTourStepChange: (step: number) => void;
};

export const SearchInputArea = ({ 
  q, setQ, ask, loading, isTourOpen, 
  isRecording, handleMicClick, answerStyle, 
  setAnswerStyle, onToolSelect, handleTourStepChange 
}: SearchInputAreaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [q, adjustHeight]);

  return (
    <div id="tour-highlight-askbar" className="ask-bar-container-new">
      <textarea
        ref={textareaRef}
        className="ask-bar-textarea"
        placeholder="Ask Umbil anything..."
        value={isTourOpen ? "What are the red flags for a headache?" : q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={adjustHeight}
        onClick={adjustHeight}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            ask();
          }
        }}
        disabled={isTourOpen}
        rows={1}
      />
      
      <div className="ask-bar-actions">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <ToolsDropdown onSelect={onToolSelect} />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AnswerStyleDropdown currentStyle={answerStyle} onStyleChange={setAnswerStyle} />

          <button 
            className={`action-icon-btn ${isRecording ? "recording" : ""}`}
            onClick={handleMicClick}
            disabled={loading || isTourOpen}
            title={isRecording ? "Stop Recording" : "Start Dictation"}
          >
            {isRecording ? (
                <div className="recording-pulse">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                </div>
            ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
            )}
          </button>

          <button className="send-icon-btn" onClick={isTourOpen ? () => handleTourStepChange(3) : ask} disabled={loading || !q.trim()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    </div>
  );
};