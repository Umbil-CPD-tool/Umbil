import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseService";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabaseService
    .from("posts")
    .update({ status: "published" })
    .eq("status", "scheduled")
    .lte("publish_date", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
