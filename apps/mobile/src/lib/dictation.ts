import Constants from "expo-constants";
import { useEffect, useRef, useState } from "react";
import { Alert, Linking } from "react-native";

/**
 * Expo Go does not ship expo-speech-recognition. Importing that package at
 * module top-level crashes the whole chat route ("Screen not found").
 * Load it only inside a development / store client.
 */
export const isExpoGo = Constants.appOwnership === "expo";

type SpeechResultEvent = {
  results?: { transcript?: string }[];
  isFinal?: boolean;
};

type SpeechErrorEvent = {
  error?: string;
};

type SpeechModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (options: {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
  }) => void;
  stop: () => void;
  addListener: (
    event: string,
    cb: (event: SpeechResultEvent & SpeechErrorEvent) => void
  ) => { remove: () => void };
};

const loadSpeechModule = (): SpeechModule | null => {
  if (isExpoGo) return null;
  try {
    // Concatenate so Metro does not hoist this into a static import (which
    // would crash Expo Go while evaluating this file).
    const pkg = "expo-speech-" + "recognition";
    const mod = require(pkg) as {
      ExpoSpeechRecognitionModule: SpeechModule;
    };
    return mod.ExpoSpeechRecognitionModule ?? null;
  } catch {
    return null;
  }
};

export const useDictation = (
  value: string,
  onChangeText: (text: string) => void
) => {
  const [isListening, setIsListening] = useState(false);
  const [dictationError, setDictationError] = useState<string | null>(null);
  const baseRef = useRef("");
  const onChangeRef = useRef(onChangeText);
  const valueRef = useRef(value);
  onChangeRef.current = onChangeText;
  valueRef.current = value;
  const speechRef = useRef<SpeechModule | null>(null);

  useEffect(() => {
    const speech = loadSpeechModule();
    speechRef.current = speech;
    if (!speech || typeof speech.addListener !== "function") return;

    const startSub = speech.addListener("start", () => {
      setDictationError(null);
      setIsListening(true);
    });
    const endSub = speech.addListener("end", () => {
      setIsListening(false);
    });
    const resultSub = speech.addListener("result", (event) => {
      const transcript = event.results?.[0]?.transcript ?? "";
      if (!transcript) return;
      if (event.isFinal) {
        baseRef.current = `${baseRef.current}${transcript} `;
        onChangeRef.current(baseRef.current.trimEnd());
      } else {
        onChangeRef.current(`${baseRef.current}${transcript}`);
      }
    });
    const errorSub = speech.addListener("error", (event) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        Alert.alert(
          "Microphone access needed",
          "Umbil needs microphone and speech recognition permissions to dictate your question. Enable them in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => void Linking.openSettings() },
          ]
        );
        return;
      }
      if (event.error === "no-speech") {
        setDictationError("No speech detected — try again.");
        return;
      }
      if (event.error === "network") {
        setDictationError(
          "No internet connection — dictation needs network access for this language."
        );
        return;
      }
      if (event.error === "aborted") return;
      setDictationError("Dictation error — please try again or type your question.");
    });

    return () => {
      startSub.remove();
      endSub.remove();
      resultSub.remove();
      errorSub.remove();
    };
  }, []);

  const startDictation = async () => {
    const speech = speechRef.current ?? loadSpeechModule();
    if (!speech) {
      Alert.alert(
        "Dictation unavailable in Expo Go",
        "You can still type questions. The microphone works in the Umbil development or App Store build."
      );
      return;
    }

    try {
      const available = speech.isRecognitionAvailable();
      if (!available) {
        Alert.alert(
          "Dictation unavailable",
          "Speech recognition isn't available on this device."
        );
        return;
      }

      const permission = await speech.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone access needed",
          "Umbil needs microphone and speech recognition permissions to dictate your question. Enable them in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => void Linking.openSettings() },
          ]
        );
        return;
      }

      setDictationError(null);
      const current = valueRef.current.trim();
      baseRef.current = current ? `${current} ` : "";
      speech.start({
        lang: "en-GB",
        interimResults: true,
        continuous: true,
      });
    } catch {
      Alert.alert(
        "Dictation unavailable",
        "This feature needs the Umbil native app, not Expo Go. You can still type your question."
      );
    }
  };

  const handleMicPress = () => {
    if (isListening) {
      try {
        speechRef.current?.stop();
      } catch {
        setIsListening(false);
      }
      return;
    }
    void startDictation();
  };

  return { isListening, dictationError, handleMicPress };
};
