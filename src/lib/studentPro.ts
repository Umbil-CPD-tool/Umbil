import { isUkAcademicEmail } from "@umbil/shared";

export { isUkAcademicEmail };

/**
 * Automatic .ac.uk Pro unlocks are retired.
 * A confirmed university email no longer writes is_pro. Student access is the £4.99 plan.
 */
export const ensureStudentPro = async (
  _userId: string,
  _profileEmail: string | null | undefined,
  isPro: boolean
): Promise<boolean> => isPro;
