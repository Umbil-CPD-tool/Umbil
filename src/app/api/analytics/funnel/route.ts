import { NextRequest, NextResponse } from "next/server";
import { recordConversionEvent } from "@/lib/analytics/recordConversionEvent";
import {
  isClientFunnelEvent,
  isLimitSurface,
  parseChannel,
  clipLabel,
} from "@/lib/analytics/conversionFunnel";
import { CORS_HEADERS, corsPreflight } from "@/lib/cors";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import { isStripePlanType } from "@/lib/stripePrices";
import { supabase } from "@/lib/supabase";

export const OPTIONS = corsPreflight;

const readUserId = async (req: NextRequest): Promise<string | null> => {
  const token = req.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) return null;
  try {
    const { data } = await supabase.auth.getUser(token);
    return data.user?.id ?? null;
  } catch {
    return null;
  }
};

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!checkRateLimit(`funnel:${ip}`, 40, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: CORS_HEADERS });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid event" }, { status: 400, headers: CORS_HEADERS });
  }

  const record = body as {
    event?: unknown;
    source?: unknown;
    surface?: unknown;
    feature?: unknown;
    planType?: unknown;
    channel?: unknown;
  };

  if (!isClientFunnelEvent(record.event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400, headers: CORS_HEADERS });
  }

  const userId = await readUserId(req);

  if (record.event === "limit_reached") {
    if (!userId || !isLimitSurface(record.surface) || record.surface !== "cpd") {
      return NextResponse.json({ error: "Invalid event" }, { status: 400, headers: CORS_HEADERS });
    }
    await recordConversionEvent({
      userId,
      eventType: "limit_reached",
      surface: "cpd",
      feature: clipLabel(record.feature, 40) ?? "cpd",
      source: clipLabel(record.source, 40) ?? "cpd",
      channel: parseChannel(record.channel),
      limit: 10,
      period: "monthly",
    });
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }

  const planType = isStripePlanType(record.planType) ? record.planType : null;
  await recordConversionEvent({
    userId,
    eventType: record.event,
    surface: "pricing",
    source: clipLabel(record.source, 40) ?? "pricing_page",
    planType,
    channel: parseChannel(record.channel),
  });

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
