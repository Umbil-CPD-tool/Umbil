import { supabaseService } from "@/lib/supabaseService";
import { isTrustedOfficialUrl, type OfficialGuidanceLink } from "@/lib/officialGuidance";
import type { CuratedGuidanceEntry } from "@/lib/officialGuidanceMap";

const OVERLAY_TTL_MS = 5 * 60 * 1000;

type OverlayRow = {
  id: string;
  aliases: string[] | null;
  links: unknown;
  priority: number | null;
  enabled: boolean | null;
};

let cachedOverlay: CuratedGuidanceEntry[] = [];
let cachedAt = 0;
let inflight: Promise<CuratedGuidanceEntry[]> | null = null;

const parseLinks = (raw: unknown): OfficialGuidanceLink[] => {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is OfficialGuidanceLink => {
    if (!item || typeof item !== "object") return false;
    const link = item as OfficialGuidanceLink;
    return (
      typeof link.title === "string" &&
      typeof link.url === "string" &&
      typeof link.publisher === "string" &&
      Boolean(isTrustedOfficialUrl(link.url))
    );
  });
};

const rowToEntry = (row: OverlayRow): CuratedGuidanceEntry | null => {
  if (!row.id || row.enabled === false) return null;
  const aliases = (row.aliases ?? [])
    .map((alias) => alias.trim().toLowerCase())
    .filter(Boolean);
  const links = parseLinks(row.links);
  if (aliases.length === 0 || links.length === 0) return null;
  return {
    id: row.id,
    aliases,
    links,
    priority: row.priority ?? 8,
  };
};

const fetchOverlay = async (): Promise<CuratedGuidanceEntry[]> => {
  try {
    const { data, error } = await supabaseService
      .from("official_guidance_entries")
      .select("id, aliases, links, priority, enabled")
      .eq("enabled", true);

    if (error || !data) {
      if (error) console.error("[Umbil] Official guidance overlay load failed:", error.message);
      return [];
    }

    return data
      .map((row) => rowToEntry(row as OverlayRow))
      .filter((entry): entry is CuratedGuidanceEntry => Boolean(entry));
  } catch (error) {
    console.error("[Umbil] Official guidance overlay unavailable:", error);
    return [];
  }
};

/** Cached Supabase overlay so new topics can ship without a deploy. */
export const loadOfficialGuidanceOverlay = async (): Promise<CuratedGuidanceEntry[]> => {
  if (Date.now() - cachedAt < OVERLAY_TTL_MS) return cachedOverlay;
  if (inflight) return inflight;

  inflight = fetchOverlay()
    .then((entries) => {
      cachedOverlay = entries;
      cachedAt = Date.now();
      return entries;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
};
