// src/components/home/MessageBubble.tsx
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CpdNudge } from "./HomeModals";

export type ConversationEntry = { type: "user" | "umbil"; content: string; question?: string; };

export function cleanMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&lt;br\s*\/?&gt;/gi, "\n")
    .replace(/\\n/g, "\n");
}

type MessageBubbleProps = {
  entry: ConversationEntry;
  index: number;
  isTourOpen: boolean;
  loading: boolean;
  isLastMessage: boolean;
  showNudge: boolean;
  onShare: () => void;
  onSmartCopy: (index: number) => void;
  onDeepDive: (entry: ConversationEntry, index: number) => void;
  onRegenerate: () => void;
  onLogCpd: (entry: ConversationEntry) => void;
  onReport: (entry: ConversationEntry) => void;
  onTourStepChange: (step: number) => void;
};

export const MessageBubble = ({
  entry, index, isTourOpen, loading, isLastMessage, showNudge,
  onShare, onSmartCopy, onDeepDive, onRegenerate, onLogCpd, onReport, onTourStepChange
}: MessageBubbleProps) => {
  const isUmbil = entry.type === "umbil";
  const className = `message-bubble ${isUmbil ? "umbil-message" : "user-message"}`;
  const highlightId = isTourOpen && isUmbil ? "tour-highlight-message" : undefined;

  return (
    <div id={highlightId} className={className}>
      <div id={`msg-content-${index}`}>
          {isUmbil ? ( 
              <div className="markdown-content-wrapper">
                  <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      components={{ table: ({ ...props }) => <div className="table-scroll-wrapper"><table {...props} /></div> }}
                  >
                      {cleanMarkdown(entry.content)}
                  </ReactMarkdown>
              </div> 
          ) : ( 
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanMarkdown(entry.content)}</ReactMarkdown> 
          )}
      </div>
      
      {isUmbil && (
        <div className="umbil-message-actions">
          <button className="action-button" onClick={onShare} title="Share conversation">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg> 
            Share
          </button>
          <button className="action-button" onClick={() => onSmartCopy(index)} title="Copy this message">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> 
            Copy
          </button>
          {isLastMessage && !loading && entry.question && ( 
            <button className="action-button" onClick={() => onDeepDive(entry, index)} title="Deep dive on this topic">
              <svg className="icon-zoom-in" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg> 
              Deep Dive
            </button> 
          )}
          {isLastMessage && !loading && ( 
            <button className="action-button" onClick={onRegenerate} title="Regenerate response">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 7.1 4.14M3.51 15A9 9 0 0 0 16.9 19.86"></path></svg> 
              Regenerate
            </button> 
          )}
          <button 
            id={isTourOpen ? "tour-highlight-cpd-button" : undefined} 
            className="action-button" 
            onClick={() => isTourOpen ? onTourStepChange(5) : onLogCpd(entry)} 
            title="Add reflection to your Learning Log"
            style={{ color: 'var(--umbil-brand-teal)', fontWeight: 600 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path></svg> 
            Capture learning
          </button>
          <button className="action-button" onClick={() => onReport(entry)} title="Report incorrect information" style={{color: '#9ca3af'}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
          </button>
        </div>
      )}

      {showNudge && <CpdNudge onLog={() => onLogCpd(entry)} />}
    </div>
  );
};