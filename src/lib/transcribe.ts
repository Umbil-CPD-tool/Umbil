export const TRANSCRIBE_MODEL = "openai/whisper-large-v3";
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
export const MAX_CONTEXT_CHARS = 200;

export const ALLOWED_AUDIO_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/aac",
  "audio/m4a",
  "audio/x-m4a",
  "audio/mp4a-latm",
  "video/webm",
  "audio/3gpp",
]);

export const mimeOf = (type: string): string => type.split(";")[0].trim().toLowerCase();

export const isAllowedAudioType = (type: string): boolean => {
  const mime = mimeOf(type);
  return !mime || ALLOWED_AUDIO_TYPES.has(mime);
};

export const clipTranscribeContext = (value: unknown): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CONTEXT_CHARS);

export const transcribePrompt = (context?: string): string => {
  const clipped = clipTranscribeContext(context);
  return clipped
    ? `UK clinical dictation. Existing note: ${clipped}`
    : "UK clinical dictation.";
};

export const isInterimTranscription = (value: unknown): boolean => {
  const flag = String(value ?? "").trim().toLowerCase();
  return flag === "true" || flag === "1" || flag === "yes";
};

export const composeDictationText = (base: string, spoken: string): string => {
  const start = base.replace(/\s+/g, " ").trim();
  const next = spoken.replace(/\s+/g, " ").trim();
  if (!next) return start;
  if (!start) return next;
  return `${start} ${next}`;
};

export const filenameForAudio = (name: string | undefined, mime: string): string => {
  if (name && /\.[a-z0-9]+$/i.test(name)) return name;
  const type = mimeOf(mime);
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return "dictation.m4a";
  if (type.includes("ogg")) return "dictation.ogg";
  if (type.includes("wav")) return "dictation.wav";
  if (type.includes("3gpp")) return "dictation.3gp";
  return "dictation.webm";
};
