import { request as httpsRequest } from "node:https";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import {
  clipTranscribeContext,
  filenameForAudio,
  isAllowedAudioType,
  isInterimTranscription,
  MAX_AUDIO_BYTES,
  mimeOf,
  TRANSCRIBE_MODEL,
  transcribePrompt,
} from "@/lib/transcribe";

export const runtime = "nodejs";
export const maxDuration = 60;

const API_KEY = process.env.TOGETHER_API_KEY;
const GENERIC_ERROR = "Could not transcribe. Please try again or type your question.";

export const OPTIONS = corsPreflight;

const getUserId = async (req: NextRequest): Promise<string | null> => {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return null;
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id || null;
  } catch {
    return null;
  }
};

const jsonError = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers: CORS_HEADERS });

const transcribeWithTogether = (
  apiKey: string,
  fields: Record<string, string>,
  audio: { filename: string; mime: string; bytes: Buffer }
): Promise<{ status: number; body: string }> => {
  const boundary = `----UmbilBoundary${Date.now().toString(16)}`;
  const chunks: Buffer[] = [];
  const push = (part: string | Buffer) => {
    chunks.push(typeof part === "string" ? Buffer.from(part, "utf8") : part);
  };

  for (const [name, value] of Object.entries(fields)) {
    push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  }

  const safeName = audio.filename.replace(/["\r\n]/g, "_");
  push(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${safeName}"\r\nContent-Type: ${audio.mime}\r\n\r\n`
  );
  push(audio.bytes);
  push(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat(chunks);

  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      {
        hostname: "api.together.ai",
        path: "/v1/audio/transcriptions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
      },
      (res) => {
        const parts: Buffer[] = [];
        res.on("data", (chunk: Buffer) => parts.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 500,
            body: Buffer.concat(parts).toString("utf8"),
          });
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
};

export async function POST(req: NextRequest) {
  if (!API_KEY) return jsonError("TOGETHER_API_KEY not set", 500);

  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonError("No audio was recorded. Please try again.", 400);
    }

    const interim = isInterimTranscription(form.get("interim"));
    const userId = await getUserId(req);
    const ip = clientIp(req);

    if (!userId) {
      const allowed = interim
        ? checkRateLimit(`transcribe-live:guest:${ip}`, 80)
        : checkRateLimit(`transcribe:guest:${ip}`, 30);
      if (!allowed) {
        return jsonError(
          "You've reached the free dictation limit. Please create a free account to continue.",
          429
        );
      }
    } else {
      const allowed = interim
        ? checkRateLimit(`transcribe-live:user:${userId}`, 400)
        : checkRateLimit(`transcribe:user:${userId}`, 200);
      if (!allowed) {
        return jsonError("Too many dictation requests. Please try again later.", 429);
      }
    }

    const raw = form.get("file");
    if (!(raw instanceof File) || raw.size === 0) {
      return jsonError("No audio was recorded. Please try again.", 400);
    }
    const file = raw;
    if (file.size > MAX_AUDIO_BYTES) {
      return jsonError("Recording is too long. Please keep dictation under a minute.", 413);
    }

    const mime = mimeOf(file.type);
    if (!isAllowedAudioType(file.type)) {
      return jsonError("Unsupported audio format. Please try again or type your question.", 415);
    }

    const context = clipTranscribeContext(form.get("context"));
    const filename = filenameForAudio(file.name, mime || "audio/webm");
    const audioBytes = Buffer.from(await file.arrayBuffer());
    const audio = {
      filename,
      mime: mime || "audio/webm",
      bytes: audioBytes,
    };
    const fields: Record<string, string> = {
      model: TRANSCRIBE_MODEL,
      language: "en",
      response_format: "json",
      prompt: transcribePrompt(context),
    };

    let togetherRes = await transcribeWithTogether(API_KEY, fields, audio);
    if (!interim && togetherRes.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      togetherRes = await transcribeWithTogether(API_KEY, fields, audio);
    }

    if (togetherRes.status < 200 || togetherRes.status >= 300) {
      console.error("[Umbil] Transcription failed:", togetherRes.status, togetherRes.body.slice(0, 400));
      return jsonError(GENERIC_ERROR, 502);
    }

    let payload: { text?: unknown } = {};
    try {
      payload = JSON.parse(togetherRes.body) as { text?: unknown };
    } catch {
      console.error("[Umbil] Transcription returned non-JSON:", togetherRes.body.slice(0, 400));
      return jsonError(GENERIC_ERROR, 502);
    }

    const text = typeof payload.text === "string" ? payload.text.replace(/\s+/g, " ").trim() : "";
    if (!text) {
      if (interim) return NextResponse.json({ text: "" }, { headers: CORS_HEADERS });
      return jsonError("No speech detected — try again.", 422);
    }

    return NextResponse.json({ text }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("[Umbil] Transcription error:", err);
    return jsonError(GENERIC_ERROR, 500);
  }
}
