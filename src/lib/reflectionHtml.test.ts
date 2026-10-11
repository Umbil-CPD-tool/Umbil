import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  reflectionBlocks,
  reflectionHasContent,
  reflectionToPlainText,
  sanitizeReflectionHtml,
  stripModelFences,
} from "./reflectionHtml";

describe("reflection html", () => {
  it("drops scripts and event handlers and keeps basic formatting", () => {
    const clean = sanitizeReflectionHtml(
      `<p onclick="alert(1)" style="text-align:right">I will <strong>explain</strong> delays.</p><script>alert(1)</script>`
    );
    assert.match(clean, /text-align:right/);
    assert.match(clean, /<strong>explain<\/strong>/);
    assert.equal(clean.includes("onclick"), false);
    assert.equal(clean.includes("<script"), false);
    assert.equal(clean.includes("alert(1)"), false);
  });

  it("treats an empty editor as blank", () => {
    assert.equal(reflectionHasContent(""), false);
    assert.equal(reflectionHasContent("<p><br/></p>"), false);
    assert.equal(reflectionHasContent("<p>I will explain delays.</p>"), true);
  });

  it("turns lists into readable plain text", () => {
    const plain = reflectionToPlainText("<ul><li>Listen first</li><li>Explain the plan</li></ul>");
    assert.match(plain, /• Listen first/);
    assert.match(plain, /• Explain the plan/);
  });

  it("keeps paragraph alignment for the PDF", () => {
    const blocks = reflectionBlocks(`<p style="text-align:center">Centred line</p><ol><li>One</li></ol>`);
    assert.equal(blocks[0].kind, "paragraph");
    if (blocks[0].kind === "paragraph") assert.equal(blocks[0].align, "center");
    assert.equal(blocks[1].kind, "list");
    if (blocks[1].kind === "list") {
      assert.equal(blocks[1].ordered, true);
      assert.deepEqual(blocks[1].items, ["One"]);
    }
  });

  it("strips model code fences", () => {
    assert.equal(stripModelFences("```html\n<p>Hello</p>\n```"), "<p>Hello</p>");
  });
});
