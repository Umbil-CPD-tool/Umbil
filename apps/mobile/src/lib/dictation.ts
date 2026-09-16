import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";

import { transcribeAudio } from "./api";

const MAX_RECORDING_MS = 60_000;
const MIN_RECORDING_MS = 400;
const LIVE_TRANSCRIBE_MS = 1600;

const recordingFile = () =>
  Platform.OS === "web"
    ? { name: "dictation.webm", type: "audio/webm" }
    : { name: "dictation.m4a", type: "audio/mp4" };

const composeDictationText = (base: string, spoken: string): string => {
  const start = base.replace(/\s+/g, " ").trim();
  const next = spoken.replace(/\s+/g, " ").trim();
  if (!next) return start;
  if (!start) return next;
  if (next.startsWith(start)) return next;
  return `${start} ${next}`;
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
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isTranscribingRef = useRef(false);
  const liveInFlightRef = useRef(false);
  const heardSpeechRef = useRef(false);
  const baseTextRef = useRef("");
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
      clearInterval(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    if (liveStartTimerRef.current) {
      clearTimeout(liveStartTimerRef.current);
      liveStartTimerRef.current = null;
    }
    liveInFlightRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      clearMaxTimer();
      clearLiveTimer();
      void recorderRef.current.stop().catch(() => undefined);
    };
  }, [clearLiveTimer, clearMaxTimer]);

  const transcribeUri = useCallback(async (
    uri: string | null,
    options: { interim?: boolean } = {}
  ) => {
    const interim = Boolean(options.interim);
    if (!uri) {
      if (!interim && !heardSpeechRef.current) {
        setDictationError("No speech detected — try again.");
      }
      return;
    }
    if (!interim) {
      isTranscribingRef.current = true;
      setIsTranscribing(true);
      setDictationError(null);
    }
    try {
      const file = recordingFile();
      const text = await transcribeAudio(
        { uri, ...file },
        baseTextRef.current,
        { interim }
      );
      if (!text) {
        if (!interim && !heardSpeechRef.current) {
          setDictationError("No speech detected — try again.");
        }
        return;
      }
      heardSpeechRef.current = true;
      onChangeRef.current(composeDictationText(baseTextRef.current, text));
    } catch (err) {
      if (interim) return;
      if (heardSpeechRef.current) return;
      const message = err instanceof Error ? err.message : "Dictation error — please try again or type your question.";
      setDictationError(message);
    } finally {
      if (!interim) {
        isTranscribingRef.current = false;
        setIsTranscribing(false);
      }
    }
  }, []);

  const transcribeLive = useCallback(() => {
    if (!isListeningRef.current || liveInFlightRef.current) return;
    const uri = recorderRef.current.uri;
    if (!uri) return;
    liveInFlightRef.current = true;
    void transcribeUri(uri, { interim: true }).finally(() => {
      liveInFlightRef.current = false;
    });
  }, [transcribeUri]);

  const stopRecording = useCallback(async () => {
    clearMaxTimer();
    clearLiveTimer();
    const elapsed = Date.now() - startedAtRef.current;
    isListeningRef.current = false;
    setIsListening(false);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      if (!heardSpeechRef.current) {
        setDictationError("Could not finish recording. Please try again.");
      }
      return;
    }
    if (elapsed < MIN_RECORDING_MS) {
      if (!heardSpeechRef.current) setDictationError("No speech detected — try again.");
      return;
    }
    await transcribeUri(recorder.uri);
  }, [clearLiveTimer, clearMaxTimer, recorder, transcribeUri]);

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
      baseTextRef.current = valueRef.current.trim();
      heardSpeechRef.current = false;
      isListeningRef.current = true;
      setIsListening(true);
      maxTimerRef.current = setTimeout(() => {
        void stopRecording();
      }, MAX_RECORDING_MS);
      liveStartTimerRef.current = setTimeout(() => {
        transcribeLive();
      }, 900);
      liveTimerRef.current = setInterval(() => {
        transcribeLive();
      }, LIVE_TRANSCRIBE_MS);
    } catch {
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
  }, [recorder, stopRecording, transcribeLive]);

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
