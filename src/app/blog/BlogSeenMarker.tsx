"use client";

import { useEffect } from "react";
import { markBlogSeen } from "@/lib/blogSeen";

export const BlogSeenMarker = () => {
  useEffect(() => {
    markBlogSeen();
  }, []);

  return null;
};
