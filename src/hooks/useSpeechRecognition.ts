"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getDeviceId } from "@/lib/store";
import { composeDictationText } from "@/lib/transcribe";

type UseSpeechRecognitionProps = {
  onTranscript: (text: string) => void;
  onError: (msg: string) => void;
  getPromptContext?: () => string;
};

const MAX_RECORDING_MS = 60_000;
const MIN_RECORDING_MS = 400;
const LIVE_TRANSCRIBE_MS = 1600;
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

const pickMimeType = (): string => {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
    return "";
  }
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
};

const extensionForMime = (mime: string): string => {
  const base = mime.split(";")[0];
  if (base.includes("mp4")) return "mp4";
  if (base.includes("ogg")) return "ogg";
  return "webm";
};

const stopStream = (stream: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop());
};

const mediaErrorMessage = (err: unknown): string => {
  const name = err instanceof DOMException ? err.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.";
  }
  if (name === "NotFoundError") {
    return "No microphone was found. Connect a microphone and try again.";
  }
  if (name === "NotReadableError") {
    return "The microphone is already in use. Close other apps using it and try again.";
  }
  return "Could not start dictation. Please check microphone permissions and try again.";
};

export function useSpeechRecognition({
  onTranscript,
  onError,
  getPromptContext,
}: UseSpeechRecognitionProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const maxTimerRef = useRef<number | null>(null);
  const liveTimerRef = useRef<number | null>(null);
  const liveStartTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const startingRef = useRef(false);
  const isRecordingRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const liveInFlightRef = useRef(false);
  const liveAbortRef = useRef<AbortController | null>(null);
  const mimeTypeRef = useRef("");
  const baseTextRef = useRef("");
  const heardSpeechRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const getPromptContextRef = useRef(getPromptContext);

  onTranscriptRef.current = onTranscript;
  onErrorRef.current = onError;
  getPromptContextRef.current = getPromptContext;

  const clearMaxTimer = useCallback(() => {
    if (maxTimerRef.current !== null) {
      window.clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const clearLiveTimer = useCallback(() => {
    if (liveTimerRef.current !== null) {
      window.clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    if (liveStartTimerRef.current !== null) {
      window.clearTimeout(liveStartTimerRef.current);
      liveStartTimerRef.current = null;
    }
    liveAbortRef.current?.abort();
    liveAbortRef.current = null;
    liveInFlightRef.current = false;
  }, []);

  const resetRecorder = useCallback(() => {
    clearMaxTimer();
    clearLiveTimer();
    stopStream(streamRef.current);
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
    isRecordingRef.current = false;
    setIsRecording(false);
  }, [clearLiveTimer, clearMaxTimer]);

  const transcribeBlob = useCallback(async (
    blob: Blob,
    mimeType: string,
    options: { interim?: boolean; signal?: AbortSignal } = {}
  ) => {
    const interim = Boolean(options.interim);
    if (!interim) {
      isTranscribingRef.current = true;
      setIsTranscribing(true);
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const extension = extensionForMime(mimeType || blob.type);
      const file = new File([blob], `dictation.${extension}`, {
        type: blob.type || mimeType || "audio/webm",
      });
      const form = new FormData();
      form.append("file", file);
      if (interim) form.append("interim", "true");
      const context = baseTextRef.current.trim();
      if (context) form.append("context", context.slice(0, 200));

      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: {
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
          "x-device-id": getDeviceId(),
        },
        body: form,
        signal: options.signal,
      });

      if (options.signal?.aborted) return;
      const payload = (await res.json().catch(() => null)) as { text?: string; error?: string } | null;
      if (!res.ok) {
        if (interim) return;
        if (heardSpeechRef.current) return;
        onErrorRef.current(payload?.error || "Could not transcribe. Please try again or type your question.");
        return;
      }
      const text = payload?.text?.trim();
      if (!text) {
        if (interim) return;
        if (heardSpeechRef.current) return;
        onErrorRef.current("No speech detected — try again.");
        return;
      }
      heardSpeechRef.current = true;
      onTranscriptRef.current(composeDictationText(baseTextRef.current, text));
    } catch {
      if (options.signal?.aborted) return;
      if (interim) return;
      if (heardSpeechRef.current) return;
      onErrorRef.current("Dictation needs an internet connection. Please try again.");
    } finally {
      if (!interim) {
        isTranscribingRef.current = false;
        setIsTranscribing(false);
      }
    }
  }, []);

  const transcribeLive = useCallback(() => {
    if (!isRecordingRef.current || liveInFlightRef.current) return;
    const recorder = recorderRef.current;
    if (recorder && typeof recorder.requestData === "function" && recorder.state === "recording") {
      recorder.requestData();
    }
    const chunks = chunksRef.current;
    if (chunks.length === 0) return;
    const type = recorder?.mimeType || mimeTypeRef.current || "audio/webm";
    const blob = new Blob(chunks, { type });
    if (blob.size < 1200) return;
    liveInFlightRef.current = true;
    const abort = new AbortController();
    liveAbortRef.current?.abort();
    liveAbortRef.current = abort;
    void transcribeBlob(blob, type, { interim: true, signal: abort.signal }).finally(() => {
      if (liveAbortRef.current === abort) {
        liveInFlightRef.current = false;
        liveAbortRef.current = null;
      }
    });
  }, [transcribeBlob]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    clearMaxTimer();
    clearLiveTimer();
    if (!recorder || recorder.state === "inactive") {
      resetRecorder();
      return;
    }
    try {
      if (typeof recorder.requestData === "function" && recorder.state === "recording") {
        recorder.requestData();
      }
      recorder.stop();
    } catch {
      resetRecorder();
    }
  }, [clearLiveTimer, clearMaxTimer, resetRecorder]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      clearMaxTimer();
      clearLiveTimer();
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {
        // Ignore teardown errors
      }
      stopStream(streamRef.current);
    };
  }, [clearLiveTimer, clearMaxTimer]);

  const startRecording = useCallback(async () => {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      onErrorRef.current("Dictation is not supported in this browser. Please type your question.");
      return;
    }
    if (!window.isSecureContext) {
      onErrorRef.current("Dictation needs a secure connection (HTTPS). Please type your question.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      onErrorRef.current("Dictation is not supported in this browser. Please type your question.");
      return;
    }

    startingRef.current = true;
    const mimeType = pickMimeType();
    mimeTypeRef.current = mimeType;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelledRef.current) {
        stopStream(stream);
        return;
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      baseTextRef.current = getPromptContextRef.current?.().trim() ?? "";
      heardSpeechRef.current = false;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        resetRecorder();
        onErrorRef.current("Could not start dictation. Please try again.");
      };

      recorder.onstop = () => {
        const elapsed = Date.now() - startedAtRef.current;
        const chunks = chunksRef.current;
        const type = recorder.mimeType || mimeType || "audio/webm";
        resetRecorder();
        if (cancelledRef.current) return;
        if (elapsed < MIN_RECORDING_MS) {
          if (!heardSpeechRef.current) onErrorRef.current("No speech detected — try again.");
          return;
        }
        const blob = new Blob(chunks, { type });
        if (blob.size < 800) {
          if (!heardSpeechRef.current) onErrorRef.current("No speech detected — try again.");
          return;
        }
        void transcribeBlob(blob, type);
      };

      recorder.start(250);
      isRecordingRef.current = true;
      setIsRecording(true);
      maxTimerRef.current = window.setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_MS);
      liveStartTimerRef.current = window.setTimeout(() => {
        transcribeLive();
      }, 900);
      liveTimerRef.current = window.setInterval(() => {
        transcribeLive();
      }, LIVE_TRANSCRIBE_MS);
    } catch (err) {
      resetRecorder();
      onErrorRef.current(mediaErrorMessage(err));
    } finally {
      startingRef.current = false;
    }
  }, [resetRecorder, stopRecording, transcribeBlob, transcribeLive]);

  const toggleRecording = useCallback(() => {
    if (isTranscribingRef.current || startingRef.current) return;
    if (isRecordingRef.current) {
      stopRecording();
      return;
    }
    void startRecording();
  }, [startRecording, stopRecording]);

  return { isRecording, isTranscribing, toggleRecording };
}
