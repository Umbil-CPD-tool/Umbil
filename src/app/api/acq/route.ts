import { NextRequest, NextResponse } from "next/server";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { normalizeAcquisitionPayload } from "@/lib/acquisitionServer";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { supabaseService } from "@/lib/supabaseService";

export const OPTIONS = corsPreflight;

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`acq:${ip}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const headerDevice = req.headers.get("x-device-id");
  if (
    body &&
    typeof body === "object" &&
    !(body as { deviceId?: unknown }).deviceId &&
    headerDevice
  ) {
    (body as { deviceId?: string }).deviceId = headerDevice;
  }

  const payload = normalizeAcquisitionPayload(body);
  if (!payload) {
    return NextResponse.json({ error: "Invalid acquisition payload" }, { status: 400, headers: CORS_HEADERS });
  }

  const { error } = await supabaseService.from("acquisition_touches").insert({
    device_id: payload.deviceId,
    source: payload.touch.source,
    medium: payload.touch.medium,
    campaign: payload.touch.campaign,
    content: payload.touch.content,
    click_id: payload.touch.clickId,
    captured_at: payload.touch.capturedAt,
  });

  if (error) {
    console.error("acquisition_touches insert failed:", error.message);
    return NextResponse.json({ error: "Could not store acquisition" }, { status: 500, headers: CORS_HEADERS });
  }

  const res = NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.append(
    "Set-Cookie",
    `umbil_aid=${encodeURIComponent(payload.deviceId)}; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax${secure}`
  );
  return res;
}
