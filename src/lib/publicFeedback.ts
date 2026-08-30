import { supabaseService } from "@/lib/supabaseService";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Collection = {
  table: "psq_surveys" | "msf_cycles";
  responseTable: "psq_responses" | "msf_responses";
  responseForeignKey: "survey_id" | "cycle_id";
  defaultTarget: number;
};

/** Default targets mirror the owner-facing analytics, so a link closes exactly when the UI says it has. */
export const PSQ_COLLECTION: Collection = {
  table: "psq_surveys",
  responseTable: "psq_responses",
  responseForeignKey: "survey_id",
  defaultTarget: 34,
};

export const MSF_COLLECTION: Collection = {
  table: "msf_cycles",
  responseTable: "msf_responses",
  responseForeignKey: "cycle_id",
  defaultTarget: 15,
};

export type OpenCollection = {
  id: string;
  title: string | null;
  custom_questions: unknown;
  status: string | null;
};

export type CollectionGate =
  | { ok: true; collection: OpenCollection }
  | { ok: false; status: number; error: string; closed: boolean };

/**
 * Confirms a submission belongs to a real collection that is still gathering
 * responses. The existence check matters most: without it any caller can write
 * rows against an id that was never issued.
 *
 * Reads the whole row rather than named columns because `status` was added to
 * psq_surveys after launch, and an older row without it has simply never been
 * closed.
 */
export async function resolveOpenCollection(
  collection: Collection,
  id: unknown
): Promise<CollectionGate> {
  if (typeof id !== "string" || !UUID_PATTERN.test(id)) {
    return { ok: false, status: 400, error: "Invalid link", closed: false };
  }

  const { data: row, error } = await supabaseService
    .from(collection.table)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, status: 404, error: "Not Found", closed: false };
  }

  if (row.status === "closed") {
    return { ok: false, status: 403, error: "Cycle Closed", closed: true };
  }

  const target = row.required_responses || collection.defaultTarget;
  const { count, error: countError } = await supabaseService
    .from(collection.responseTable)
    .select("*", { count: "exact", head: true })
    .eq(collection.responseForeignKey, id);

  if (countError) {
    console.error(`${collection.responseTable} count failed:`, countError);
    return { ok: false, status: 500, error: "Internal Error", closed: false };
  }

  if ((count ?? 0) >= target) {
    return { ok: false, status: 403, error: "Cycle Closed", closed: true };
  }

  return {
    ok: true,
    collection: {
      id: row.id,
      title: row.title ?? null,
      custom_questions: row.custom_questions ?? null,
      status: row.status ?? null,
    },
  };
}
