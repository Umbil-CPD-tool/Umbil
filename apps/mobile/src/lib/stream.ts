import { TOOL_TAG_REGEX } from "@umbil/shared";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  toolId?: string;
  question?: string;
};

export const parseToolPrefix = (text: string) => {
  const match = text.match(TOOL_TAG_REGEX);
  if (!match) return { toolId: undefined as string | undefined, content: text };
  return {
    toolId: match[1],
    content: text.replace(TOOL_TAG_REGEX, "").replace(/^\n+/, ""),
  };
};

export const readTextStream = async (
  response: Response,
  onChunk: (fullText: string) => void
): Promise<string> => {
  if (!response.body) {
    const text = await response.text();
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
