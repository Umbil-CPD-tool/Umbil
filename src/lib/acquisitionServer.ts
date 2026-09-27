import {
  isAcquisitionTouch,
  isValidAcquisitionDeviceId,
  type AcquisitionTouch,
} from "@umbil/shared";

export type AcquisitionTouchPayload = {
  deviceId: string;
  touch: AcquisitionTouch;
};

export const normalizeAcquisitionPayload = (body: unknown): AcquisitionTouchPayload | null => {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const deviceId = record.deviceId;
  if (!isValidAcquisitionDeviceId(deviceId)) return null;

  const nested = record.touch;
  const candidate =
    nested && typeof nested === "object"
      ? nested
      : {
          source: record.source,
          medium: record.medium ?? null,
          campaign: record.campaign ?? null,
          content: record.content ?? null,
          clickId: record.clickId ?? null,
          capturedAt: record.capturedAt,
        };

  if (!isAcquisitionTouch(candidate)) return null;

  const capturedAt = Date.parse(candidate.capturedAt);
  if (!Number.isFinite(capturedAt)) return null;
  // Reject touches more than 1 day in the future or older than 90 days.
  const now = Date.now();
  if (capturedAt > now + 24 * 60 * 60 * 1000) return null;
  if (capturedAt < now - 90 * 24 * 60 * 60 * 1000) return null;

  return {
    deviceId,
    touch: {
      source: candidate.source.trim().slice(0, 120),
      medium: candidate.medium ? candidate.medium.trim().slice(0, 120) : null,
      campaign: candidate.campaign ? candidate.campaign.trim().slice(0, 200) : null,
      content: candidate.content ? candidate.content.trim().slice(0, 200) : null,
      clickId: candidate.clickId ? candidate.clickId.trim().slice(0, 500) : null,
      capturedAt: new Date(capturedAt).toISOString(),
    },
  };
};
