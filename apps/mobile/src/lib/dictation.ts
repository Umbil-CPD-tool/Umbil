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

const recordingFile = () =>
  Platform.OS === "web"
    ? { name: "dictation.webm", type: "audio/webm" }
    : { name: "dictation.m4a", type: "audio/mp4" };

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
  const startingRef = useRef(false);
  const isListeningRef = useRef(false);
  const isTranscribingRef = useRef(false);
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

  useEffect(() => {
    return () => {
      clearMaxTimer();
      void recorderRef.current.stop().catch(() => undefined);
    };
  }, [clearMaxTimer]);

  const transcribeUri = useCallback(async (uri: string | null) => {
    if (!uri) {
      setDictationError("No speech detected — try again.");
      return;
    }
    isTranscribingRef.current = true;
    setIsTranscribing(true);
    setDictationError(null);
    try {
      const file = recordingFile();
      const text = await transcribeAudio({ uri, ...file }, valueRef.current);
      const previous = valueRef.current.trim();
      onChangeRef.current(previous ? `${previous} ${text}` : text);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Dictation error — please try again or type your question.";
      setDictationError(message);
    } finally {
      isTranscribingRef.current = false;
      setIsTranscribing(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    clearMaxTimer();
    const elapsed = Date.now() - startedAtRef.current;
    isListeningRef.current = false;
    setIsListening(false);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      setDictationError("Could not finish recording. Please try again.");
      return;
    }
    if (elapsed < MIN_RECORDING_MS) {
      setDictationError("No speech detected — try again.");
      return;
    }
    await transcribeUri(recorder.uri);
  }, [clearMaxTimer, recorder, transcribeUri]);

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
      isListeningRef.current = true;
      setIsListening(true);
      maxTimerRef.current = setTimeout(() => {
        void stopRecording();
      }, MAX_RECORDING_MS);
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
  }, [recorder, stopRecording]);

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
