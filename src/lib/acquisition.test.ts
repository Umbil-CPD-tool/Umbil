import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  deserializeAcquisitionTouch,
  isValidAcquisitionDeviceId,
  parseAcquisitionTouch,
  pickFirstTouch,
  serializeAcquisitionTouch,
} from "@umbil/shared";
import { normalizeAcquisitionPayload } from "./acquisitionServer";

describe("parseAcquisitionTouch", () => {
  it("reads explicit UTM tags", () => {
    const touch = parseAcquisitionTouch(
      "utm_source=facebook&utm_medium=paid&utm_campaign=APPRAISAL&utm_content=video_1",
      "2026-09-18T12:00:00.000Z"
    );
    assert.deepEqual(touch, {
      source: "facebook",
      medium: "paid",
      campaign: "APPRAISAL",
      content: "video_1",
      clickId: null,
      capturedAt: "2026-09-18T12:00:00.000Z",
    });
  });

  it("infers facebook from fbclid when utm_source is missing", () => {
    const touch = parseAcquisitionTouch(
      "?fbclid=IwAR123&utm_campaign=120256391211660538",
      "2026-09-19T08:00:00.000Z"
    );
    assert.equal(touch?.source, "facebook");
    assert.equal(touch?.medium, "paid");
    assert.equal(touch?.campaign, "120256391211660538");
    assert.equal(touch?.clickId, "IwAR123");
  });

  it("parses a full URL and returns null when nothing attributable", () => {
    const fromUrl = parseAcquisitionTouch(
      "https://umbil.co.uk/?utm_source=ig&utm_medium=paid&utm_campaign=appraisal_sep26&fbclid=abc",
      "2026-09-20T00:00:00.000Z"
    );
    assert.equal(fromUrl?.source, "ig");
    assert.equal(fromUrl?.clickId, "abc");
    assert.equal(parseAcquisitionTouch("https://umbil.co.uk/"), null);
    assert.equal(parseAcquisitionTouch(""), null);
  });
});

describe("pickFirstTouch", () => {
  it("keeps the earliest first-touch", () => {
    const early = parseAcquisitionTouch("utm_source=facebook&utm_campaign=a", "2026-09-01T00:00:00.000Z")!;
    const late = parseAcquisitionTouch("utm_source=google&utm_campaign=b", "2026-09-10T00:00:00.000Z")!;
    assert.equal(pickFirstTouch(early, late)?.campaign, "a");
    assert.equal(pickFirstTouch(late, early)?.campaign, "a");
    assert.equal(pickFirstTouch(null, late)?.campaign, "b");
  });
});

describe("serializeAcquisitionTouch", () => {
  it("round-trips", () => {
    const touch = parseAcquisitionTouch(
      { utm_source: "invite", utm_medium: "share" },
      "2026-09-18T12:00:00.000Z"
    )!;
    const raw = serializeAcquisitionTouch(touch);
    assert.deepEqual(deserializeAcquisitionTouch(raw), touch);
    assert.equal(deserializeAcquisitionTouch("{not-json"), null);
    assert.equal(deserializeAcquisitionTouch('{"source":""}'), null);
  });
});

describe("normalizeAcquisitionPayload", () => {
  it("accepts flat and nested payloads", () => {
    const flat = normalizeAcquisitionPayload({
      deviceId: "device_abc12345",
      source: "facebook",
      medium: "paid",
      campaign: "APPRAISAL",
      content: null,
      clickId: "fbclid1",
      capturedAt: new Date().toISOString(),
    });
    assert.equal(flat?.touch.source, "facebook");
    assert.equal(flat?.deviceId, "device_abc12345");

    const nested = normalizeAcquisitionPayload({
      deviceId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      touch: {
        source: "ig",
        medium: "paid",
        campaign: "x",
        content: null,
        clickId: null,
        capturedAt: new Date().toISOString(),
      },
    });
    assert.equal(nested?.touch.source, "ig");
  });

  it("rejects bad device ids and stale timestamps", () => {
    assert.equal(isValidAcquisitionDeviceId("short"), false);
    assert.equal(
      normalizeAcquisitionPayload({
        deviceId: "no spaces allowed!!",
        source: "facebook",
        capturedAt: new Date().toISOString(),
      }),
      null
    );
    assert.equal(
      normalizeAcquisitionPayload({
        deviceId: "device_abc12345",
        source: "facebook",
        capturedAt: "2010-01-01T00:00:00.000Z",
      }),
      null
    );
  });
});
