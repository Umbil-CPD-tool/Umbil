import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { composeDictationText } from "./dictationText";
import { keyboardOverlap } from "./keyboardOverlap";

describe("composeDictationText", () => {
  it("shows the first phrase on its own", () => {
    assert.equal(composeDictationText("", "chest pain"), "chest pain");
  });

  it("keeps typed text and appends the next spoken phrase", () => {
    assert.equal(
      composeDictationText("45 year old", "with chest pain"),
      "45 year old with chest pain"
    );
  });

  it("does not repeat a transcript that already includes the earlier words", () => {
    assert.equal(
      composeDictationText("chest pain", "chest pain for two days"),
      "chest pain for two days"
    );
  });
});

describe("keyboardOverlap", () => {
  it("uses the predictive bar when the reported height stops short of it", () => {
    assert.equal(keyboardOverlap(844, 300, 480), 544);
  });

  it("keeps the reported height when that already clears the keyboard", () => {
    assert.equal(keyboardOverlap(844, 400, 500), 500);
  });

  it("is zero once the keyboard has left the window", () => {
    assert.equal(keyboardOverlap(844, 844, 0), 0);
    assert.equal(keyboardOverlap(844, 0, 0), 0);
  });
});
