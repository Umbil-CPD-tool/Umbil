"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  GUIDED_REFLECTION_PROMPTS,
  emptyGuidedReflectionAnswers,
  hasGuidedReflectionAnswer,
  seedLearnedFromNotes,
  type GuidedReflectionAnswers,
} from "@umbil/shared";

type HelpMeReflectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialLearned?: string;
  sourceQuestion?: string;
  resetNonce?: number;
  isSubmitting?: boolean;
  onSubmit: (answers: GuidedReflectionAnswers) => void;
};

export const HelpMeReflectModal = ({
  isOpen,
  onClose,
  initialLearned = "",
  sourceQuestion = "",
  resetNonce = 0,
  isSubmitting = false,
  onSubmit,
}: HelpMeReflectModalProps) => {
  const [answers, setAnswers] = useState<GuidedReflectionAnswers>(
    emptyGuidedReflectionAnswers()
  );
  const seedLearnedRef = useRef(initialLearned);
  seedLearnedRef.current = initialLearned;

  useEffect(() => {
    setAnswers({
      ...emptyGuidedReflectionAnswers(),
      learned: seedLearnedFromNotes(seedLearnedRef.current),
    });
  }, [resetNonce]);

  useEffect(() => {
    if (!isOpen) return;
    setAnswers((prev) => {
      if (hasGuidedReflectionAnswer(prev)) return prev;
      return {
        ...emptyGuidedReflectionAnswers(),
        learned: seedLearnedFromNotes(seedLearnedRef.current),
      };
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const canSubmit = hasGuidedReflectionAnswer(answers) && !isSubmitting;

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 220 }}
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-me-reflect-title"
        className="modal-content"
        style={{ maxWidth: 640, padding: 28 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="close-button"
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <h2
          id="help-me-reflect-title"
          style={{
            margin: "0 36px 8px 0",
            fontSize: "1.35rem",
            fontWeight: 700,
            color: "var(--umbil-foreground)",
          }}
        >
          Help me reflect
        </h2>
        <p
          style={{
            margin: "0 0 22px",
            fontSize: "0.95rem",
            lineHeight: 1.5,
            color: "var(--umbil-muted)",
          }}
        >
          Answer in your own words. Umbil will structure this as Learning,
          Application, and Next steps — the What / So What / Now What format
          appraisers expect. It will not invent clinical detail. You can leave
          a prompt blank.
        </p>
        {sourceQuestion.trim() && sourceQuestion !== "Manual Entry" ? (
          <p
            style={{
              margin: "-10px 0 20px",
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--umbil-hover-bg)",
              fontSize: "0.85rem",
              lineHeight: 1.45,
              color: "var(--umbil-foreground)",
            }}
          >
            <span style={{ color: "var(--umbil-muted)", fontWeight: 600 }}>
              Reflecting on:{" "}
            </span>
            {sourceQuestion.trim()}
          </p>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {GUIDED_REFLECTION_PROMPTS.map((prompt, index) => (
            <div key={prompt.id} className="form-group" style={{ marginBottom: 0 }}>
              <label
                className="form-label"
                htmlFor={`reflect-${prompt.id}`}
                style={{ color: "var(--umbil-foreground)", marginBottom: 6 }}
              >
                {index + 1}. {prompt.title}
              </label>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "0.82rem",
                  color: "var(--umbil-muted)",
                  lineHeight: 1.45,
                }}
              >
                {prompt.hint}
              </p>
              <textarea
                id={`reflect-${prompt.id}`}
                className="form-control"
                value={answers[prompt.id]}
                onChange={(event) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [prompt.id]: event.target.value,
                  }))
                }
                placeholder="A sentence or two is enough."
                rows={3}
                style={{
                  resize: "vertical",
                  minHeight: 84,
                  fontFamily: "inherit",
                  background: "var(--umbil-input-bg, transparent)",
                  color: "var(--umbil-foreground)",
                  borderColor: "var(--umbil-border)",
                }}
              />
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 24,
          }}
        >
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onSubmit(answers)}
            disabled={!canSubmit}
            style={{ minWidth: 180, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Structuring…
              </>
            ) : (
              "Structure my reflection"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
