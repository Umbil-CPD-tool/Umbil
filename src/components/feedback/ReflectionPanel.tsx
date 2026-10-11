'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Copy,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Save,
  SpellCheck,
  Underline,
  Undo2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  reflectionHasContent,
  reflectionToPlainText,
  sanitizeReflectionHtml,
  stripModelFences,
} from '@/lib/reflectionHtml';

type ReflectionPanelProps = {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isSaving: boolean;
  footer?: ReactNode;
};

const COMMANDS = [
  { label: 'Bold', icon: Bold, command: 'bold' },
  { label: 'Italic', icon: Italic, command: 'italic' },
  { label: 'Underline', icon: Underline, command: 'underline' },
  { label: 'Bullet list', icon: List, command: 'insertUnorderedList' },
  { label: 'Numbered list', icon: ListOrdered, command: 'insertOrderedList' },
  { label: 'Align left', icon: AlignLeft, command: 'justifyLeft' },
  { label: 'Align centre', icon: AlignCenter, command: 'justifyCenter' },
  { label: 'Align right', icon: AlignRight, command: 'justifyRight' },
  { label: 'Undo', icon: Undo2, command: 'undo' },
  { label: 'Redo', icon: Redo2, command: 'redo' },
] as const;

export const ReflectionPanel = ({ value, onChange, onSave, isSaving, footer }: ReflectionPanelProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtml = useRef(value);
  const [isFixingGrammar, setIsFixingGrammar] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasText = reflectionHasContent(value);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastHtml.current) return;
    editor.innerHTML = value;
    lastHtml.current = value;
  }, [value]);

  const publish = () => {
    const html = editorRef.current?.innerHTML ?? '';
    lastHtml.current = html;
    onChange(html);
  };

  const runCommand = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command);
    publish();
  };

  const copyText = async () => {
    const plain = reflectionToPlainText(value);
    if (!plain) return;
    await navigator.clipboard.writeText(plain);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const fixGrammar = async () => {
    if (!hasText || isFixingGrammar) return;
    setIsFixingGrammar(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/generate-reflection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'tidy_reflection',
          userNotes: sanitizeReflectionHtml(value),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Grammar tidy failed');
      }

      const corrected = sanitizeReflectionHtml(stripModelFences(await response.text()));
      if (!reflectionHasContent(corrected)) {
        alert('The grammar check did not return any text. Your draft is unchanged.');
        return;
      }
      lastHtml.current = corrected;
      if (editorRef.current) editorRef.current.innerHTML = corrected;
      onChange(corrected);
    } catch (error) {
      console.error(error);
      alert('Could not tidy the grammar. Please try again.');
    } finally {
      setIsFixingGrammar(false);
    }
  };

  return (
    <div className="bg-[var(--umbil-surface)] border border-[var(--umbil-card-border)] rounded-xl overflow-hidden shadow-sm">
      <div className="bg-[var(--umbil-hover-bg)]/50 p-6 border-b border-[var(--umbil-card-border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold">Appraisal-Ready Reflection</h3>
          <p className="text-sm text-[var(--umbil-muted)]">Write this in your own words. Fix grammar tidies spelling and wording, and leaves the meaning as you wrote it.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void fixGrammar()}
            disabled={!hasText || isFixingGrammar}
            className="btn btn--outline text-sm bg-white flex items-center gap-2"
          >
            <SpellCheck size={14} />
            {isFixingGrammar ? 'Fixing grammar...' : 'Fix grammar'}
          </button>
          <button
            type="button"
            onClick={() => void copyText()}
            disabled={!hasText}
            className="btn btn--outline text-sm bg-white flex items-center gap-2"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy text'}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!hasText || isSaving}
            className="btn btn--primary text-sm shadow-md shadow-teal-500/20 flex items-center gap-2"
          >
            {isSaving ? 'Saving...' : <><Save size={14} /> Save to Capture learning</>}
          </button>
        </div>
      </div>

      <div className="border-b border-[var(--umbil-divider)] px-3 py-2 flex flex-wrap gap-1 bg-[var(--umbil-bg)]/40">
        {COMMANDS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.command}
              type="button"
              aria-label={tool.label}
              title={tool.label}
              disabled={isFixingGrammar}
              onMouseDown={(event) => {
                event.preventDefault();
                runCommand(tool.command);
              }}
              className="p-2 rounded-md text-[var(--umbil-text)] hover:bg-[var(--umbil-hover-bg)] disabled:opacity-40"
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      <div className="relative">
        {!hasText && (
          <p className="pointer-events-none absolute left-6 top-6 text-[var(--umbil-muted)]/70">
            Write your reflection here. This box starts blank so you can complete it yourself.
          </p>
        )}
        <div
          ref={editorRef}
          contentEditable={!isFixingGrammar}
          role="textbox"
          aria-multiline="true"
          aria-label="Appraisal-ready reflection"
          spellCheck
          suppressContentEditableWarning
          onInput={publish}
          className="reflection-writing-box w-full min-h-[32rem] px-6 py-6 outline-none text-[var(--umbil-text)] leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1"
        />
      </div>
      {footer}
    </div>
  );
};
