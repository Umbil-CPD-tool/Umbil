import { fetch as expoFetch } from 'expo/fetch';
import { env } from '@/lib/env';
import { getDeviceId } from '@/lib/device';
import type { AnswerStyle, ChatMessage, UmbilProfile } from '@/types/app';

function endpoint(path: string): string {
  return `${env.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function readError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('application/json')) {
      const body = (await response.json()) as { error?: string; message?: string };
      return body.error || body.message || `Request failed (${response.status})`;
    }

    const text = await response.text();
    return text || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
}

export async function streamClinicalAnswer(options: {
  token: string;
  messages: ChatMessage[];
  profile: UmbilProfile | null;
  answerStyle: AnswerStyle;
  conversationId: string;
  onChunk: (chunk: string) => void;
}): Promise<void> {
  const deviceId = await getDeviceId();

  const response = await expoFetch(endpoint('/api/ask'), {
    method: 'POST',
    headers: {
      Accept: 'text/plain',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.token}`,
      'x-device-id': deviceId,
    },
    body: JSON.stringify({
      messages: options.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      profile: options.profile
        ? {
            grade: options.profile.grade,
            custom_instructions: options.profile.custom_instructions,
          }
        : null,
      answerStyle: options.answerStyle,
      saveToHistory: true,
      conversationId: options.conversationId,
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  if (!response.body) {
    options.onChunk(await response.text());
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) options.onChunk(decoder.decode(value, { stream: true }));
  }

  const finalChunk = decoder.decode();
  if (finalChunk) options.onChunk(finalChunk);
}

export async function deleteUmbilAccount(token: string): Promise<void> {
  const response = await expoFetch(endpoint('/api/auth/delete-account'), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) throw new Error(await readError(response));
}
