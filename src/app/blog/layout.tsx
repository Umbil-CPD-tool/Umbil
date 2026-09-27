import type { ReactNode } from "react";
import { BlogSeenMarker } from "@/app/blog/BlogSeenMarker";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <BlogSeenMarker />
      {children}
    </>
  );
}
