import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { BLOG_SEEN_EVENT, BLOG_SEEN_STORAGE_KEY, hasSeenBlog, markBlogSeen } from "./blogSeen";

type FakeWindow = {
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
  dispatchEvent: (event: Event) => boolean;
};

const globalWithWindow = globalThis as unknown as { window?: FakeWindow };

let store: Map<string, string>;
let dispatched: string[];

const installWindow = (storageThrows = false) => {
  globalWithWindow.window = {
    localStorage: {
      getItem: (key) => {
        if (storageThrows) throw new Error("blocked");
        return store.get(key) ?? null;
      },
      setItem: (key, value) => {
        if (storageThrows) throw new Error("blocked");
        store.set(key, value);
      },
    },
    dispatchEvent: (event) => {
      dispatched.push(event.type);
      return true;
    },
  };
};

describe("blog seen flag", () => {
  beforeEach(() => {
    store = new Map();
    dispatched = [];
    installWindow();
  });

  afterEach(() => {
    delete globalWithWindow.window;
  });

  it("reports unseen until the blog is opened, then remembers it", () => {
    assert.equal(hasSeenBlog(), false);
    markBlogSeen();
    assert.equal(store.get(BLOG_SEEN_STORAGE_KEY), "1");
    assert.equal(hasSeenBlog(), true);
  });

  it("tells open menus to hide the label only the first time", () => {
    markBlogSeen();
    markBlogSeen();
    assert.deepEqual(dispatched, [BLOG_SEEN_EVENT]);
  });

  it("never shows the label when storage is blocked", () => {
    installWindow(true);
    assert.equal(hasSeenBlog(), true);
    assert.doesNotThrow(() => markBlogSeen());
  });

  it("treats server rendering as seen so the label never flashes", () => {
    delete globalWithWindow.window;
    assert.equal(hasSeenBlog(), true);
  });
});
