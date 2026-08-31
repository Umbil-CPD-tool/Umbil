import { TOOL_TAG_REGEX } from "@umbil/shared";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  toolId?: string;
  action?: "capture_learning";
  question?: string;
};

export type StreamPrefix = {
  toolId?: string;
  action?: "capture_learning";
  content: string;
};

const ACTION_TAG_RE = /^\[\[ACTION:capture_learning\]\]\s*/;

export const parseStreamPrefix = (text: string): StreamPrefix => {
  if (text.startsWith("[[") && text.length < 64 && !text.includes("]]")) {
    return { content: text };
  }

  const actionMatch = text.match(ACTION_TAG_RE);
  if (actionMatch) {
    return {
      action: "capture_learning",
      content: text.replace(ACTION_TAG_RE, "").replace(/^\n+/, ""),
    };
  }

  const match = text.match(TOOL_TAG_REGEX);
  if (!match) return { content: text };
  return {
    toolId: match[1],
    content: text.replace(TOOL_TAG_REGEX, "").replace(/^\n+/, ""),
  };
};

export const parseToolPrefix = (text: string): StreamPrefix =>
  parseStreamPrefix(text);

export const readTextStream = async (
  response: {
    body?: ReadableStream<Uint8Array> | null;
    text?: () => Promise<string>;
  },
  onChunk: (fullText: string) => void
): Promise<string> => {
  if (!response.body) {
    const text = (await response.text?.()) ?? "";
    onChunk(text);
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    onChunk(full);
  }

  full += decoder.decode();
  onChunk(full);
  return full;
};
