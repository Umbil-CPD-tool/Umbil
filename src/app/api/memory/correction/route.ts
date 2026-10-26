import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { CORS_HEADERS, corsPreflight, withCors } from "@/lib/cors";
import { detectEditSignal } from "@umbil/shared";
import { recordStyleSignal } from "@/lib/memorySignals";

export const OPTIONS = corsPreflight;

const getUserId = async (req: NextRequest): Promise<string | null> => {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1];
    if (!token) return null;
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
};

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Sign in to save a preference." }, { status: 401, headers: CORS_HEADERS });
  }

  const body = await req.json().catch(() => null) as { original?: unknown; edited?: unknown; toolId?: unknown } | null;
  const original = typeof body?.original === "string" ? body.original : "";
  const edited = typeof body?.edited === "string" ? body.edited : "";
  const toolId = typeof body?.toolId === "string" ? body.toolId : null;
  if (!original || !edited || original.length > 20000 || edited.length > 20000) {
    return NextResponse.json({ recorded: false }, { headers: CORS_HEADERS });
  }

  const signal = detectEditSignal(original, edited, toolId);
  if (!signal) return NextResponse.json({ recorded: false }, { headers: CORS_HEADERS });

  try {
    const result = await recordStyleSignal(userId, signal);
    return NextResponse.json({ recorded: true, ...result }, { headers: withCors() });
  } catch (error) {
    console.error("[Umbil Memory] Edit correction failed:", error);
    return NextResponse.json({ recorded: false }, { headers: CORS_HEADERS });
  }
}
