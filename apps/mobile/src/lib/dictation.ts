import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { cacheDirectory, copyAsync, deleteAsync } from "expo-file-system/legacy";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";

import { transcribeAudio } from "./api";
import { composeDictationText } from "./dictationText";

const MAX_RECORDING_MS = 60_000;
const MIN_RECORDING_MS = 400;
/** Same cadence as the website: a short clip goes up while you are still talking. */
const LIVE_SEGMENT_MS = 1400;

const recordingFile = () =>
  Platform.OS === "web"
    ? { name: "dictation.webm", type: "audio/webm" }
    : { name: "dictation.m4a", type: "audio/mp4" };

const snapshotRecording = async (uri: string): Promise<string> => {
  if (!cacheDirectory) return uri;
  const ext = Platform.OS === "web" ? "webm" : "m4a";
  const dest = `${cacheDirectory}dictation-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  await copyAsync({ from: uri, to: dest });
  return dest;
};

const discardSnapshot = (uri: string) => {
  if (!cacheDirectory || !uri.startsWith(cacheDirectory)) return;
  void deleteAsync(uri, { idempotent: true }).catch(() => undefined);
};

export const useDictation = (
  value: string,
  onChangeText: (text: string) => void
) => {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderRef = useRef(recorder);
  recorderRef.current = recorder;
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const startedAtRef = useRef(0);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const sessionRef = useRef(false);
  const segmentStartedAtRef = useRef(0);
  const segmentLockRef = useRef(Promise.resolve());
  const transcriptQueueRef = useRef(Promise.resolve());
  const heardSpeechRef = useRef(false);
  const baseTextRef = useRef("");
  const spokenRef = useRef("");
  const onChangeRef = useRef(onChangeText);
  const valueRef = useRef(value);
  onChangeRef.current = onChangeText;
  valueRef.current = value;

  const clearMaxTimer = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const clearLiveTimer = useCallback(() => {
    if (liveTimerRef.current) {
      clearTimeout(liveTimerRef.current);
      liveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      sessionRef.current = false;
      clearMaxTimer();
      clearLiveTimer();
      void recorderRef.current.stop().catch(() => undefined);
    };
  }, [clearLiveTimer, clearMaxTimer]);

  const publishSpoken = useCallback((segment: string) => {
    if (!segment.trim()) return;
    heardSpeechRef.current = true;
    spokenRef.current = composeDictationText(spokenRef.current, segment);
    onChangeRef.current(composeDictationText(baseTextRef.current, spokenRef.current));
  }, []);

  const enqueueTranscript = useCallback((uri: string) => {
    transcriptQueueRef.current = transcriptQueueRef.current
      .then(async () => {
        const text = await transcribeAudio(
          { uri, ...recordingFile() },
          "",
          { interim: true }
        );
        if (text) publishSpoken(text);
      })
      .catch(() => undefined)
      .finally(() => discardSnapshot(uri));
  }, [publishSpoken]);

  // iOS only finalises an audio file when recording stops, so each short
  // segment is closed, copied, and sent while the next segment starts.
  const captureSegment = useCallback((restart: boolean) => {
    const run = segmentLockRef.current.then(async () => {
      const elapsed = Date.now() - segmentStartedAtRef.current;
      try {
        await recorderRef.current.stop();
      } catch {
        return;
      }
      const uri = recorderRef.current.uri;
      let snapshot: string | null = null;
      if (uri && elapsed >= MIN_RECORDING_MS) {
        try {
          snapshot = await snapshotRecording(uri);
        } catch {
          snapshot = uri;
        }
      }
      if (restart && sessionRef.current) {
        try {
          await recorderRef.current.prepareToRecordAsync();
          recorderRef.current.record();
          segmentStartedAtRef.current = Date.now();
        } catch {
          sessionRef.current = false;
          isListeningRef.current = false;
          setIsListening(false);
          setDictationError("Dictation stopped. You can still type your question.");
        }
      }
      if (snapshot) enqueueTranscript(snapshot);
    });
    segmentLockRef.current = run.catch(() => undefined);
    return run;
  }, [enqueueTranscript]);

  const scheduleSegment = useCallback(() => {
    if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
    liveTimerRef.current = setTimeout(() => {
      if (!sessionRef.current) return;
      void captureSegment(true).finally(() => {
        if (sessionRef.current) scheduleSegment();
      });
    }, LIVE_SEGMENT_MS);
  }, [captureSegment]);

  const stopRecording = useCallback(async () => {
    clearMaxTimer();
    clearLiveTimer();
    sessionRef.current = false;
    isListeningRef.current = false;
    setIsListening(false);
    isTranscribingRef.current = true;
    setIsTranscribing(true);
    try {
      await captureSegment(false);
      await transcriptQueueRef.current;
      await setAudioModeAsync({ allowsRecording: false });
      if (!heardSpeechRef.current) {
        setDictationError("No speech detected — try again.");
      }
    } catch {
      if (!heardSpeechRef.current) {
        setDictationError("Could not finish recording. Please try again.");
      }
    } finally {
      isTranscribingRef.current = false;
      setIsTranscribing(false);
    }
  }, [captureSegment, clearLiveTimer, clearMaxTimer]);

  const startRecording = useCallback(async () => {
    startingRef.current = true;
    setDictationError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone access needed",
          "Umbil needs microphone access to dictate your question. Enable it in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => void Linking.openSettings() },
          ]
        );
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAtRef.current = Date.now();
      segmentStartedAtRef.current = startedAtRef.current;
      baseTextRef.current = valueRef.current.trim();
      spokenRef.current = "";
      heardSpeechRef.current = false;
      sessionRef.current = true;
      isListeningRef.current = true;
      setIsListening(true);
      maxTimerRef.current = setTimeout(() => {
        void stopRecording();
      }, MAX_RECORDING_MS);
      scheduleSegment();
    } catch {
      sessionRef.current = false;
      Alert.alert(
        "Dictation unavailable",
        "Could not start the microphone. You can still type your question."
      );
      try {
        await setAudioModeAsync({ allowsRecording: false });
      } catch {
        // Ignore teardown errors
      }
    } finally {
      startingRef.current = false;
    }
  }, [recorder, scheduleSegment, stopRecording]);

  const handleMicPress = () => {
    if (isTranscribingRef.current || startingRef.current) return;
    if (isListeningRef.current) {
      void stopRecording();
      return;
    }
    void startRecording();
  };

  return { isListening, isTranscribing, dictationError, handleMicPress };
};
