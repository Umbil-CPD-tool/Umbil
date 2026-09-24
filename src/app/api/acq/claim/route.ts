import { NextRequest, NextResponse } from "next/server";
import {
  acquisitionProfileFields,
  isValidAcquisitionDeviceId,
  type AcquisitionTouch,
} from "@umbil/shared";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { supabaseService } from "@/lib/supabaseService";

export const OPTIONS = corsPreflight;

type TouchRow = {
  id: string;
  source: string;
  medium: string | null;
  campaign: string | null;
  content: string | null;
  click_id: string | null;
  captured_at: string;
};

const rowToTouch = (row: TouchRow): AcquisitionTouch => ({
  source: row.source,
  medium: row.medium,
  campaign: row.campaign,
  content: row.content,
  clickId: row.click_id,
  capturedAt: row.captured_at,
});

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`acq-claim:${ip}`, 30, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS_HEADERS });
  }

  const auth = req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  const {
    data: { user },
    error: authError,
  } = await supabaseService.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const deviceIdRaw = body.deviceId ?? req.headers.get("x-device-id");
  const deviceId = isValidAcquisitionDeviceId(deviceIdRaw) ? deviceIdRaw : null;

  const { data: profile, error: profileError } = await supabaseService
    .from("profiles")
    .select("id, acquisition_source, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("acq claim profile read failed:", profileError.message);
    return NextResponse.json({ error: "Could not read profile" }, { status: 500, headers: CORS_HEADERS });
  }

  if (profile?.acquisition_source) {
    return NextResponse.json({ ok: true, alreadySet: true, touch: null }, { headers: CORS_HEADERS });
  }

  if (!deviceId) {
    return NextResponse.json({ ok: true, touch: null }, { headers: CORS_HEADERS });
  }

  const { data: rows, error: touchError } = await supabaseService
    .from("acquisition_touches")
    .select("id, source, medium, campaign, content, click_id, captured_at")
    .eq("device_id", deviceId)
    .is("claimed_by", null)
    .order("captured_at", { ascending: true })
    .limit(1);

  if (touchError) {
    console.error("acq claim touch read failed:", touchError.message);
    return NextResponse.json({ error: "Could not read acquisition" }, { status: 500, headers: CORS_HEADERS });
  }

  const row = (rows?.[0] as TouchRow | undefined) ?? null;
  if (!row) {
    return NextResponse.json({ ok: true, touch: null }, { headers: CORS_HEADERS });
  }

  const touch = rowToTouch(row);
  const fields = acquisitionProfileFields(touch);

  if (!profile) {
    const { error: upsertError } = await supabaseService.from("profiles").upsert(
      { id: user.id, email: user.email ?? null, ...fields },
      { onConflict: "id" }
    );
    if (upsertError) {
      console.error("acq claim upsert failed:", upsertError.message);
      return NextResponse.json({ error: "Could not save acquisition" }, { status: 500, headers: CORS_HEADERS });
    }
  } else {
    const { error: updateError } = await supabaseService
      .from("profiles")
      .update(fields)
      .eq("id", user.id)
      .is("acquisition_source", null);
    if (updateError) {
      console.error("acq claim update failed:", updateError.message);
      return NextResponse.json({ error: "Could not save acquisition" }, { status: 500, headers: CORS_HEADERS });
    }
  }

  const { error: claimError } = await supabaseService
    .from("acquisition_touches")
    .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("claimed_by", null);

  if (claimError) {
    console.error("acq claim mark failed:", claimError.message);
  }

  return NextResponse.json({ ok: true, touch }, { headers: CORS_HEADERS });
}
