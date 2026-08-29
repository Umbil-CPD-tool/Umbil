export const INVITE_URL = "https://umbil.co.uk/?utm_source=invite&utm_medium=share";

export const INVITE_TITLE = "Umbil \u2014 clinical questions, referrals, and learning";

/** Gift-framed, specific, short enough for SMS / WhatsApp. */
export const INVITE_TEXT =
  "Thought this might help on shift \u2014 Umbil answers clinical questions from NICE/SIGN and drafts referrals in seconds.";

export const INVITE_MESSAGE = `${INVITE_TEXT}\n${INVITE_URL}`;

export const getInviteWhatsAppHref = () =>
  `https://wa.me/?text=${encodeURIComponent(INVITE_MESSAGE)}`;

export const getInviteEmailHref = () =>
  `mailto:?subject=${encodeURIComponent("Umbil for clinical work")}&body=${encodeURIComponent(INVITE_MESSAGE)}`;

export const getInviteSmsHref = () =>
  `sms:?&body=${encodeURIComponent(INVITE_MESSAGE)}`;

export const canUseNativeShare = () =>
  typeof navigator !== "undefined" && typeof navigator.share === "function";

/** Returns true if native share ran or the user cancelled it (do not open a fallback). */
export const shareInviteNative = async (): Promise<boolean> => {
  if (!canUseNativeShare()) return false;
  try {
    await navigator.share({
      title: INVITE_TITLE,
      text: INVITE_MESSAGE,
    });
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return true;
    return false;
  }
};

export const copyInviteMessage = async (): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(INVITE_MESSAGE);
    return true;
  } catch {
    return false;
  }
};
