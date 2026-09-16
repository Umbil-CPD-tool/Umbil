import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clipTranscribeContext,
  filenameForAudio,
  isAllowedAudioType,
  MAX_AUDIO_BYTES,
  mimeOf,
  transcribePrompt,
} from "./transcribe";

describe("transcribe helpers", () => {
  it("strips codec suffixes from MIME types", () => {
    assert.equal(mimeOf("audio/webm;codecs=opus"), "audio/webm");
    assert.equal(mimeOf("audio/mp4"), "audio/mp4");
  });

  it("allows browser and phone dictation formats", () => {
    assert.equal(isAllowedAudioType("audio/webm;codecs=opus"), true);
    assert.equal(isAllowedAudioType("audio/mp4"), true);
    assert.equal(isAllowedAudioType("audio/m4a"), true);
    assert.equal(isAllowedAudioType("audio/wav"), true);
    assert.equal(isAllowedAudioType("application/json"), false);
  });

  it("builds a short UK clinical prompt and clips context", () => {
    assert.equal(transcribePrompt(), "UK clinical dictation.");
    assert.equal(
      transcribePrompt("  45F 2WW  "),
      "UK clinical dictation. Existing note: 45F 2WW"
    );
    assert.equal(clipTranscribeContext("  a".repeat(300)).length, 200);
  });

  it("picks a filename Together will accept", () => {
    assert.equal(filenameForAudio("clip.m4a", "audio/mp4"), "clip.m4a");
    assert.equal(filenameForAudio(undefined, "audio/mp4"), "dictation.m4a");
    assert.equal(filenameForAudio(undefined, "audio/webm;codecs=opus"), "dictation.webm");
  });

  it("keeps the upload cap under a minute of speech", () => {
    assert.equal(MAX_AUDIO_BYTES, 4 * 1024 * 1024);
  });
});
