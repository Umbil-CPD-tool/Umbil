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

describe("menu entry points", () => {
  const appMenu = readFileSync(path.resolve("apps/mobile/src/components/SideMenu.tsx"), "utf8");
  const webMenu = readFileSync(path.resolve("src/components/MobileNav.tsx"), "utf8");

  it("opens the public blog hub from the app menu", () => {
    assert.match(appMenu, /label:\s*"Blog"/);
    assert.match(appMenu, /\$\{origin\}\/blog/);
  });

  it("keeps blog admin out of the menus", () => {
    assert.doesNotMatch(webMenu, /\/blog\/admin/);
    assert.doesNotMatch(appMenu, /\/blog\/admin/);
  });

  it("labels the appraisals link as My Appraisals on web and app", () => {
    assert.match(webMenu, /label:\s*"My Appraisals"/);
    assert.match(appMenu, /label:\s*"My Appraisals"/);
  });

  it("uses text links for the footer and puts Settings with Sign Out under the name", () => {
    assert.doesNotMatch(webMenu, /footer-btn/);
    assert.doesNotMatch(appMenu, /footerBtn/);
    assert.match(webMenu, /className="profile-actions"[\s\S]*className="settings-link"[\s\S]*Sign Out/);
    assert.match(appMenu, /styles\.profileActions[\s\S]*accessibilityLabel="Settings"[\s\S]*Sign Out/);
  });

  it("shows a New label on Blog until the blog has been opened, on web and app", () => {
    assert.match(webMenu, /showBlogNew && <span className="footer-new-pill">New<\/span>/);
    assert.match(webMenu, /onClick=\{handleBlogClick\}/);
    assert.match(appMenu, /BLOG_SEEN_KEY = "umbil_blog_seen"/);
    assert.match(appMenu, /label: "Blog", onPress: openBlog, isNew: showBlogNew/);
    const blogLayout = readFileSync(path.resolve("src/app/blog/layout.tsx"), "utf8");
    assert.match(blogLayout, /<BlogSeenMarker \/>/);
  });

  it("does not truncate the signed-in name to one line", () => {
    assert.doesNotMatch(webMenu, /\.user-name \{[^}]*text-overflow: ellipsis/);
    assert.doesNotMatch(appMenu, /style=\{styles\.userName\} numberOfLines=\{1\}/);
  });
});
