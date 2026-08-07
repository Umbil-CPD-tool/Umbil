import { redirect } from "next/navigation";

/** Legacy URL — keep for bookmarks; canonical landing is `/`. */
export default function LandingRedirectPage() {
  redirect("/");
}
