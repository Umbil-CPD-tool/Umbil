import { getSupabase } from "./supabase";
import { isUkNation, isWorkplaceSetting, resolveSpecialty } from "@umbil/shared";

export type Profile = {
  id: string;
  email: string | null;
  academic_email?: string | null;
  full_name: string | null;
  grade: string | null;
  specialty: string | null;
  nation: string | null;
  workplace_setting: string | null;
  dob: string | null;
  custom_instructions: string | null;
  opt_in_updates?: boolean;
  opt_in_newsletter?: boolean;
  weekly_summary_seen_week?: string | null;
  is_pro?: boolean;
  subscription_status?: string | null;
  plan_type?: string | null;
  stripe_customer_id?: string | null;
};

type AuthMetadata = {
  full_name?: unknown;
  grade?: unknown;
  specialty?: unknown;
  nation?: unknown;
  workplace_setting?: unknown;
};

const textFromMetadata = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const emptyProfileFromAuth = (
  user: { id: string; email?: string; user_metadata?: AuthMetadata }
): Profile => ({
  id: user.id,
  email: user.email || null,
  academic_email: null,
  full_name: textFromMetadata(user.user_metadata?.full_name),
  grade: textFromMetadata(user.user_metadata?.grade),
  specialty: textFromMetadata(user.user_metadata?.specialty),
  nation: isUkNation(textFromMetadata(user.user_metadata?.nation))
    ? textFromMetadata(user.user_metadata?.nation)
    : null,
  workplace_setting: isWorkplaceSetting(textFromMetadata(user.user_metadata?.workplace_setting))
    ? textFromMetadata(user.user_metadata?.workplace_setting)
    : null,
  dob: null,
  custom_instructions: null,
  opt_in_updates: false,
  opt_in_newsletter: false,
  is_pro: false,
});

const backfillFromAuthMetadata = async (
  profile: Profile,
  user: { id: string; email?: string; user_metadata?: AuthMetadata }
): Promise<Profile> => {
  const fromAuth = emptyProfileFromAuth(user);
  const patch: Partial<Profile> = {};

  if (!profile.full_name && fromAuth.full_name) patch.full_name = fromAuth.full_name;
  if (!profile.grade && fromAuth.grade) patch.grade = fromAuth.grade;
  if (!profile.specialty && fromAuth.specialty) patch.specialty = fromAuth.specialty;
  if (!profile.nation && fromAuth.nation) patch.nation = fromAuth.nation;
  if (!profile.workplace_setting && fromAuth.workplace_setting) {
    patch.workplace_setting = fromAuth.workplace_setting;
  }
  if (!profile.email && fromAuth.email) patch.email = fromAuth.email;

  if (Object.keys(patch).length === 0) return profile;

  const { error } = await getSupabase().from("profiles").update(patch).eq("id", user.id);
  if (error) return profile;
  return { ...profile, ...patch };
};

export async function getMyProfile(): Promise<Profile | null> {
  const supabase = getSupabase();
  const {
    data: { user },
    error: uErr,
  } = await supabase.auth.getUser();
  if (uErr || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    return emptyProfileFromAuth(user);
  }

  return backfillFromAuthMetadata(data as Profile, user);
}

const EDITABLE_PROFILE_FIELDS = [
  "academic_email",
  "full_name",
  "grade",
  "specialty",
  "nation",
  "workplace_setting",
  "dob",
  "custom_instructions",
  "opt_in_updates",
  "opt_in_newsletter",
] as const;

export async function upsertMyProfile(p: Partial<Profile>) {
  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const payload: Partial<Profile> = {
    id: user.id,
    email: user.email,
  };

  for (const field of EDITABLE_PROFILE_FIELDS) {
    if (p[field] !== undefined) {
      Object.assign(payload, { [field]: p[field] });
    }
  }

  if (typeof payload.grade === "string") {
    payload.grade = payload.grade.trim() || null;
  }
  if (typeof payload.specialty === "string") {
    payload.specialty = payload.specialty.trim() || null;
  }
  if (payload.grade !== undefined && payload.specialty === undefined) {
    payload.specialty = resolveSpecialty(payload.grade, null);
  } else if (payload.grade !== undefined) {
    payload.specialty = resolveSpecialty(payload.grade, payload.specialty ?? null);
  }
  if (typeof payload.nation === "string") {
    payload.nation = isUkNation(payload.nation) ? payload.nation : null;
  }
  if (typeof payload.workplace_setting === "string") {
    payload.workplace_setting = isWorkplaceSetting(payload.workplace_setting)
      ? payload.workplace_setting
      : null;
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" });
  if (error) throw error;
}
