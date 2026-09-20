import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanNewsletterHtml,
  draftFromNewsletter,
  draftsFromCandidates,
  excerptFromText,
  fetchNewsletterCandidates,
  htmlToMarkdown,
  isLikelyNewsletterEmail,
  isTransactionalEmail,
  slugify,
  uniqueSlug,
} from "./resendNewsletterImport";

describe("resend newsletter import helpers", () => {
  it("slugifies titles and avoids reserved routes", () => {
    assert.equal(slugify("Weekly Tips & Best Practices"), "weekly-tips-best-practices");
    assert.equal(uniqueSlug("newsletter", new Set()), "newsletter-post");
    assert.equal(uniqueSlug("weekly-tips", new Set(["weekly-tips"])), "weekly-tips-2");
  });

  it("builds a short excerpt", () => {
    assert.equal(excerptFromText("Short note"), "Short note");
    assert.equal(excerptFromText("a".repeat(300)).length, 280);
    assert.equal(excerptFromText("a".repeat(300)).endsWith("…"), true);
  });

  it("skips transactional Resend mail and keeps newsletter subjects", () => {
    assert.equal(
      isTransactionalEmail("Umbil <noreply@notifications.umbil.co.uk>", "You have been invited to complete MSF"),
      true
    );
    assert.equal(
      isTransactionalEmail("Umbil <hello@notifications.umbil.co.uk>", "Welcome to Umbil Pro"),
      true
    );
    assert.equal(
      isLikelyNewsletterEmail("Umbil <hello@notifications.umbil.co.uk>", "Welcome to Umbil Pro"),
      false
    );
    assert.equal(
      isLikelyNewsletterEmail("Umbil <hello@notifications.umbil.co.uk>", "Umbil weekly newsletter: referral tips"),
      true
    );
  });

  it("strips tracking pixels, unsubscribe blocks, and merge tokens", () => {
    const html = `
      <html><body>
        <p>Hello {{{contact.first_name|there}}}!</p>
        <p>This week's clinical tip is about safety netting.</p>
        <img src="https://example.com/pixel.gif" width="1" height="1" />
        <p><a href="https://example.com/unsubscribe">Unsubscribe</a></p>
      </body></html>
    `;
    const cleaned = cleanNewsletterHtml(html);
    assert.equal(cleaned.includes("pixel.gif"), false);
    assert.equal(/unsubscribe/i.test(cleaned), false);
    assert.equal(cleaned.includes("{{{"), false);
    assert.equal(cleaned.includes("safety netting"), true);

    const markdown = htmlToMarkdown(html);
    assert.equal(markdown.includes("safety netting"), true);
    assert.equal(markdown.includes("<p>"), false);
  });

  it("creates drafts tagged newsletter without publishing", () => {
    const draft = draftFromNewsletter(
      {
        externalId: "broadcast-1",
        title: "Umbil weekly newsletter",
        html: "<p>Capture learning during clinic.</p>",
        previewText: "This week's workflow tips",
        sentAt: "2026-03-12T09:00:00.000Z",
      },
      new Set()
    );

    assert.equal(draft.status, "draft");
    assert.equal(draft.source, "resend");
    assert.equal(draft.tags.includes("newsletter"), true);
    assert.equal(draft.slug, "umbil-weekly-newsletter-2026-03-12");
    assert.equal(draft.excerpt, "This week's workflow tips");
    assert.equal(draft.content.includes("Capture learning"), true);
  });

  it("skips candidates that already have an external id", () => {
    const result = draftsFromCandidates(
      [
        { externalId: "already", title: "Old" },
        { externalId: "new-one", title: "Fresh newsletter", text: "Hello" },
      ],
      new Set(["already"]),
      new Set()
    );

    assert.equal(result.skipped, 1);
    assert.equal(result.imported.length, 1);
    assert.equal(result.imported[0].external_id, "new-one");
  });

  it("prefers sent broadcasts over individual emails", async () => {
    const candidates = await fetchNewsletterCandidates({
      broadcasts: {
        list: async () => ({
          data: {
            has_more: false,
            data: [{ id: "b1", name: "Weekly", status: "sent", sent_at: "2026-04-01T09:00:00.000Z" }],
          },
          error: null,
        }),
        get: async () => ({
          data: {
            id: "b1",
            name: "Weekly",
            status: "sent",
            subject: "Umbil weekly newsletter",
            html: "<p>Hello clinic.</p>",
            sent_at: "2026-04-01T09:00:00.000Z",
          },
          error: null,
        }),
      },
      emails: {
        list: async () => {
          throw new Error("emails.list should not run when broadcasts exist");
        },
        get: async () => {
          throw new Error("emails.get should not run when broadcasts exist");
        },
      },
    });

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].externalId, "b1");
    assert.equal(candidates[0].title, "Umbil weekly newsletter");
  });
});
