import * as Clipboard from "expo-clipboard";
import { Linking, Share } from "react-native";

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

export const shareInvite = async (): Promise<boolean> => {
  try {
    await Share.share({
      title: INVITE_TITLE,
      message: INVITE_MESSAGE,
      url: INVITE_URL,
    });
    return true;
  } catch {
    return false;
  }
};

export const copyInvite = async (): Promise<boolean> => {
  try {
    await Clipboard.setStringAsync(INVITE_MESSAGE);
    return true;
  } catch {
    return false;
  }
};

export const openInviteWhatsApp = () => Linking.openURL(getInviteWhatsAppHref());

export const openInviteEmail = () => Linking.openURL(getInviteEmailHref());

export const openInviteSms = () => Linking.openURL(getInviteSmsHref());
