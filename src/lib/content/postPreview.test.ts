import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPostPreview,
  buildPostTeaser,
  cleanArticleMarkdown,
  estimateReadingMinutes,
  findPostCoverImage,
  findPostHeadline,
  stripInlineMarkdown,
  truncateAtWord,
} from "./postPreview";

const NEWSLETTER = [
  "They rarely mention ketamine. They come with symptoms.",
  "\u200C\u00A0\u200C\u00A0\u200C\u00A0",
  "Acute illness, fasting, surgery — know when to pause.",
  "\u00A0",
  "Hi everyone,",
  "Hope you’ve had a good week.",
  "Something caught my attention this week.",
  "NHS Grampian has launched a specialist _**Ketamine Bladder Clinic**_, alongside a new campaign aimed at 13 to 25 year olds highlighting the harms associated with ketamine use.",
  "* * *",
  "## Ketamine bladder: a GP's guide to spotting it",
  "![Poster warning about the risks of ketamine use](https://resend-attachments.s3.amazonaws.com/abc/poster.png)",
  "It’s a striking development, and perhaps a sign of how much the landscape has changed.",
].join("\n\n");

describe("blog post teaser", () => {
  it("skips the preheader, template filler, greeting and pleasantries", () => {
    const teaser = buildPostTeaser({
      excerpt: "They rarely mention ketamine. They come with symptoms.",
      content: NEWSLETTER,
    });
    assert.ok(teaser.startsWith("Something caught my attention this week. NHS Grampian"), teaser);
    assert.doesNotMatch(teaser, /know when to pause|Hi everyone|Hope you/);
    assert.doesNotMatch(teaser, /\*|_|!\[/);
  });

  it("stays within the teaser length and ends on a whole word", () => {
    const teaser = buildPostTeaser({ excerpt: "", content: NEWSLETTER });
    assert.ok(teaser.length <= 241, `teaser too long: ${teaser.length}`);
    assert.doesNotMatch(teaser, /\s…$/);
  });

  it("skips unsubscribe boilerplate at the top of older issues", () => {
    const teaser = buildPostTeaser({
      excerpt: "Micro-CPD you can use in your next clinic",
      content: [
        "Micro-CPD you can use in your next clinic",
        "## Heads up! Umbil is sending you weekly newsletters",
        "If you'd like to unsubscribe from our weekly newsletters, simply press the button below:",
        "Four presentations you'll see this week, each with the quickest safe approach so you can move through clinic with confidence and fewer second guesses.",
      ].join("\n\n"),
    });
    assert.match(teaser, /^Four presentations/);
  });

  it("drops a leading pleasantry sentence but keeps the hook in the same paragraph", () => {
    const teaser = buildPostTeaser({
      excerpt: "",
      content:
        "I hope you’ve all had a good week. There always seems to be something new emerging around GLP-1 drugs at the moment, but this caught my attention this week and I thought it was worth sharing.",
    });
    assert.match(teaser, /^There always seems to be something new/);
  });

  it("tidies accidental double full stops without touching real ellipses", () => {
    assert.equal(stripInlineMarkdown("Cervical screening remains unequal.. Wait... what"), "Cervical screening remains unequal. Wait... what");
  });

  it("falls back to the excerpt when the body has nothing usable", () => {
    assert.equal(
      buildPostTeaser({ excerpt: "New blogs from Umbil launching", content: "## Hello\n\n![x](https://a.b/c.png)" }),
      "New blogs from Umbil launching"
    );
  });
});

describe("blog post preview details", () => {
  it("uses the first article heading as the headline", () => {
    assert.equal(findPostHeadline(NEWSLETTER), "Ketamine bladder: a GP's guide to spotting it");
    assert.equal(
      findPostHeadline("## Heads up! Umbil is sending you weekly newsletters\n\n## What changed"),
      "What changed"
    );
  });

  it("prefers an uploaded cover and otherwise uses the first inline image", () => {
    assert.deepEqual(findPostCoverImage({ cover_image_url: "https://cdn/cover.jpg", content: NEWSLETTER }), {
      url: "https://cdn/cover.jpg",
      alt: "",
    });
    assert.deepEqual(findPostCoverImage({ cover_image_url: null, content: NEWSLETTER }), {
      url: "https://resend-attachments.s3.amazonaws.com/abc/poster.png",
      alt: "Poster warning about the risks of ketamine use",
    });
    assert.equal(findPostCoverImage({ cover_image_url: null, content: "No images here." }), null);
  });

  it("estimates reading time in whole minutes with a one minute floor", () => {
    assert.equal(estimateReadingMinutes("short"), 1);
    assert.equal(estimateReadingMinutes(Array.from({ length: 660 }, () => "word").join(" ")), 3);
  });

  it("builds every preview field together", () => {
    const preview = buildPostPreview({ excerpt: "They rarely mention ketamine.", content: NEWSLETTER, cover_image_url: null });
    assert.ok(preview.teaser.length > 60);
    assert.equal(preview.headline, "Ketamine bladder: a GP's guide to spotting it");
    assert.ok(preview.coverImage);
    assert.equal(preview.readingMinutes, 1);
  });
});

describe("blog article body", () => {
  it("drops the email preheader and filler above the greeting", () => {
    const body = cleanArticleMarkdown(NEWSLETTER, "They rarely mention ketamine. They come with symptoms.");
    assert.ok(body.startsWith("Hi everyone,"), body.slice(0, 60));
    assert.match(body, /## Ketamine bladder/);
  });

  it("drops a leading line that repeats the excerpt when there is no greeting", () => {
    const body = cleanArticleMarkdown("Discover new features\n\nWe added two things.", "Discover new features");
    assert.equal(body, "We added two things.");
  });

  it("keeps long opening paragraphs even when a greeting follows", () => {
    const opening = "A".repeat(200);
    const body = cleanArticleMarkdown(`${opening}\n\nHi everyone,\n\nMore text.`, "");
    assert.ok(body.startsWith(opening));
  });

  it("preserves indentation inside nested lists", () => {
    const body = cleanArticleMarkdown("Intro\n\n*   Item\n\n    Continued", "");
    assert.match(body, /\n\n {4}Continued/);
  });
});

describe("markdown helpers", () => {
  it("strips inline formatting to plain text", () => {
    assert.equal(stripInlineMarkdown("**Bold** and _italic_ with [a link](https://x.y)"), "Bold and italic with a link");
  });

  it("truncates on a word boundary with an ellipsis", () => {
    assert.equal(truncateAtWord("alpha beta gamma delta", 14), "alpha beta…");
    assert.equal(truncateAtWord("short", 12), "short");
  });
});
