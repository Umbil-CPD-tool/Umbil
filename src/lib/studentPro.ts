import { supabaseService } from "@/lib/supabaseService";

/** UK university addresses. Ownership still has to be confirmed on the auth user. */
export const isUkAcademicEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.ac\.uk$/i.test(email.trim());
};

/**
 * Confirmed .ac.uk accounts are Pro. A normal free account (any other email)
 * returns immediately. The auth lookup only runs when the profile has no email
 * stored, which is the case that used to leave students on the search cap.
 */
export const ensureStudentPro = async (
  userId: string,
  profileEmail: string | null | undefined,
  isPro: boolean
): Promise<boolean> => {
  if (isPro) return true;
  if (isUkAcademicEmail(profileEmail)) {
    const { error } = await supabaseService
      .from("profiles")
      .update({ is_pro: true })
      .eq("id", userId);
    return !error;
  }
  if (profileEmail) return false;
  return grantStudentPro(userId);
};

const grantStudentPro = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabaseService.auth.admin.getUserById(userId);
  const user = data.user;
  if (error || !user?.email_confirmed_at || !isUkAcademicEmail(user.email)) return false;

  const email = user.email!.trim();
  const { data: updated, error: updateError } = await supabaseService
    .from("profiles")
    .update({ email, is_pro: true })
    .eq("id", userId)
    .select("id");

  if (updateError) {
    console.error("Failed to grant student Pro", updateError);
    return false;
  }

  if (!updated?.length) {
    const { error: insertError } = await supabaseService
      .from("profiles")
      .insert({ id: userId, email, is_pro: true });
    if (insertError) {
      console.error("Failed to create student profile", insertError);
      return false;
    }
  }

  return true;
};
