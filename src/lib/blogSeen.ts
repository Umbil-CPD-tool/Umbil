export const BLOG_SEEN_STORAGE_KEY = "umbil_blog_seen";
export const BLOG_SEEN_EVENT = "umbil:blog-seen";

export function hasSeenBlog() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(BLOG_SEEN_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

export function markBlogSeen() {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage.getItem(BLOG_SEEN_STORAGE_KEY) === "1") return;
    window.localStorage.setItem(BLOG_SEEN_STORAGE_KEY, "1");
    window.dispatchEvent(new Event(BLOG_SEEN_EVENT));
  } catch {
    return;
  }
}
