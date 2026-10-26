import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatContinuityBlock,
  mergeConversationNote,
  redactClinicalIdentifiers,
  selectRelatedNotes,
  wantsPriorWork,
  type ConversationNote,
} from "@umbil/shared";

const note = (id: string, title: string, summary: string, updatedAt: string): ConversationNote => ({
  conversationId: id,
  title,
  summary,
  updatedAt,
});

describe("conversation notes", () => {
  it("strips emails, phones, and long identifiers from the saved note", () => {
    const merged = mergeConversationNote(
      null,
      "Email the patient ada@example.com on 07123 456789 about the article",
      "NHS 123 456 7890 was discussed. Reply stays short."
    );
    assert.match(merged?.summary ?? "", /\[email\]/);
    assert.match(merged?.summary ?? "", /\[phone\]/);
    assert.match(merged?.summary ?? "", /\[number\]/);
    assert.doesNotMatch(merged?.summary ?? "", /ada@example.com/);
    assert.equal(redactClinicalIdentifiers("CRP 45"), "CRP 45");
  });

  it("keeps the original title and the latest point as the chat grows", () => {
    const first = mergeConversationNote(null, "Draft the editorial on continuity", "Open with the clinic story.");
    const second = mergeConversationNote(first, "Make the ending sharper", "End on the patient's question.");
    assert.match(second?.title ?? "", /editorial/);
    assert.match(second?.summary ?? "", /clinic story/);
    assert.match(second?.summary ?? "", /patient's question/);
  });

  it("opens earlier work only when the question refers to it", () => {
    assert.equal(wantsPriorWork("What did we decide about that article?"), true);
    assert.equal(wantsPriorWork("Remember that I prefer short letters."), false);
    assert.equal(wantsPriorWork("What is the dose of amoxicillin?"), false);
  });

  it("finds the matching note and falls back to recent work for last week", () => {
    const notes = [
      note("a", "Editorial on continuity", "Decided to open with the clinic story.", "2026-10-20T10:00:00.000Z"),
      note("b", "Referral style", "Preferred a shorter letter.", "2026-10-25T10:00:00.000Z"),
    ];
    const found = selectRelatedNotes("What did we decide about the editorial?", notes, new Date("2026-10-26T12:00:00.000Z"));
    assert.equal(found[0]?.conversationId, "a");

    const recent = selectRelatedNotes("Where did we leave things last week?", notes, new Date("2026-10-26T12:00:00.000Z"));
    assert.equal(recent[0]?.conversationId, "b");
    assert.match(formatContinuityBlock(null, recent), /Do not copy details from one case into another/);
  });
});
