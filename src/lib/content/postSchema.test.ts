import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { postSchema, slugifyPostTitle } from "./postSchema";

describe("blog post slug helpers", () => {
  it("builds a URL slug from a title", () => {
    assert.equal(slugifyPostTitle("This week's clinical nugget"), "this-weeks-clinical-nugget");
    assert.equal(slugifyPostTitle("  GLP-1 drugs & risk  "), "glp-1-drugs-risk");
  });

  it("rejects reserved section slugs", () => {
    const parsed = postSchema.safeParse({
      title: "Newsletter",
      slug: "newsletter",
      excerpt: "Archive",
      content: "Hello",
      status: "draft",
      tags: [],
    });
    assert.equal(parsed.success, false);
  });

  it("accepts a unique dated slug", () => {
    const parsed = postSchema.safeParse({
      title: "This week's clinical nugget",
      slug: "this-weeks-clinical-nugget-2026-01-26",
      excerpt: "A short summary for SEO",
      content: "Hello",
      status: "published",
      tags: ["newsletter"],
    });
    assert.equal(parsed.success, true);
  });
});

describe("public blog entry points", () => {
  it("opens the public blog hub from the mobile menu", () => {
    const source = readFileSync(path.resolve("apps/mobile/src/components/SideMenu.tsx"), "utf8");
    assert.match(source, /label:\s*"Blog"/);
    assert.match(source, /\$\{origin\}\/blog/);
  });
});
