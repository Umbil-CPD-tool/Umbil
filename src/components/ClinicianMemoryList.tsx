"use client";

import { useEffect, useState } from "react";
import { MEMORY_FIELD_HINT } from "@/lib/clinicalProfile";
import {
  addMyMemory,
  deleteMyMemory,
  dismissCountingSignal,
  listCountingSignals,
  listMyMemories,
  memorySourceLabel,
  updateMyMemory,
  type ClinicianMemory,
  type CountingSignal,
} from "@/lib/clinicianMemoryClient";
import { CORRECTION_PROMOTION_COUNT } from "@umbil/shared";

const messageFrom = (error: unknown): string =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";

export const ClinicianMemoryList = () => {
  const [memories, setMemories] = useState<ClinicianMemory[]>([]);
  const [signals, setSignals] = useState<CountingSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [rows, noticed] = await Promise.all([listMyMemories(), listCountingSignals()]);
        if (!cancelled) {
          setMemories(rows);
          setSignals(noticed);
        }
      } catch (loadError: unknown) {
        if (!cancelled) setError(messageFrom(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const addMemory = async () => {
    setBusyId("new");
    setError(null);
    try {
      const created = await addMyMemory(draft);
      setMemories((current) => [...current, created]);
      setDraft("");
    } catch (addError: unknown) {
      setError(messageFrom(addError));
    } finally {
      setBusyId(null);
    }
  };

  const saveEdit = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const updated = await updateMyMemory(id, editingBody);
      setMemories((current) => current.map((memory) => (memory.id === id ? updated : memory)));
      setEditingId(null);
      setEditingBody("");
    } catch (saveError: unknown) {
      setError(messageFrom(saveError));
    } finally {
      setBusyId(null);
    }
  };

  const removeMemory = async (memory: ClinicianMemory) => {
    if (!window.confirm("Delete this memory? Umbil will stop using it.")) return;
    setBusyId(memory.id);
    setError(null);
    try {
      await deleteMyMemory(memory.id);
      setMemories((current) => current.filter((item) => item.id !== memory.id));
      if (editingId === memory.id) {
        setEditingId(null);
        setEditingBody("");
      }
    } catch (deleteError: unknown) {
      setError(messageFrom(deleteError));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div className="card__body">
        <h3>What Umbil remembers</h3>
        <p className="section-description" style={{ marginTop: 8, marginBottom: 16, fontSize: "0.9rem" }}>
          {MEMORY_FIELD_HINT}
        </p>

        {loading ? <p>Loading memories...</p> : null}

        {signals.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: "0.85rem", color: "var(--umbil-muted)", marginTop: 0 }}>
              Umbil saves a habit after the same correction {CORRECTION_PROMOTION_COUNT} times. Dismiss a one-off.
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {signals.map((signal) => (
                <li key={signal.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0" }}>
                  <span>
                    {signal.body}{" "}
                    <span style={{ color: "var(--umbil-muted)" }}>
                      ({signal.count} of {CORRECTION_PROMOTION_COUNT})
                    </span>
                  </span>
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={() => {
                      void dismissCountingSignal(signal.id)
                        .then(() => setSignals((current) => current.filter((item) => item.id !== signal.id)))
                        .catch((dismissError: unknown) => setError(messageFrom(dismissError)));
                    }}
                  >
                    Dismiss
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!loading && memories.length === 0 ? (
          <p style={{ color: "var(--umbil-muted)", marginBottom: 16 }}>
            Nothing saved yet. Add a preference below, or tell Umbil in chat.
          </p>
        ) : null}

        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {memories.map((memory) => {
            const editing = editingId === memory.id;
            const busy = busyId === memory.id;
            return (
              <li
                key={memory.id}
                style={{
                  borderTop: "1px solid var(--umbil-border)",
                  padding: "12px 0",
                }}
              >
                <p style={{ fontSize: "0.8rem", color: "var(--umbil-muted)", margin: "0 0 6px" }}>
                  {memorySourceLabel(memory.source)}
                </p>
                {editing ? (
                  <textarea
                    className="form-control"
                    rows={3}
                    value={editingBody}
                    onChange={(event) => setEditingBody(event.target.value)}
                    disabled={busy}
                    aria-label="Edit memory"
                  />
                ) : (
                  <p style={{ margin: 0 }}>{memory.body}</p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {editing ? (
                    <>
                      <button
                        type="button"
                        className="btn btn--primary"
                        onClick={() => void saveEdit(memory.id)}
                        disabled={busy}
                      >
                        {busy ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        className="btn btn--outline"
                        onClick={() => {
                          setEditingId(null);
                          setEditingBody("");
                        }}
                        disabled={busy}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn btn--outline"
                        onClick={() => {
                          setEditingId(memory.id);
                          setEditingBody(memory.body);
                          setError(null);
                        }}
                        disabled={busyId !== null}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn--outline"
                        onClick={() => void removeMemory(memory)}
                        disabled={busy}
                        aria-label={`Delete memory: ${memory.body}`}
                      >
                        {busy ? "Deleting..." : "Delete"}
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label" htmlFor="new-clinician-memory">
            Add a memory
          </label>
          <textarea
            id="new-clinician-memory"
            className="form-control"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="e.g. I prefer referral letters in short prose, with absolute risk figures."
            disabled={busyId === "new"}
          />
        </div>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void addMemory()}
          disabled={busyId === "new" || !draft.trim()}
        >
          {busyId === "new" ? "Saving..." : "Add memory"}
        </button>
        {error ? <p style={{ color: "var(--umbil-danger, #b42318)", marginTop: 12 }}>{error}</p> : null}
      </div>
    </div>
  );
};
