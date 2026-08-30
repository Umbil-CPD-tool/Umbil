// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    // Only use this if you run linting in a separate CI step to save build time
    ignoreDuringBuilds: true, 
  },
  // Ensure we can use external images if needed later
  images: {
    remotePatterns: [],
  },
  // Fix for @react-pdf/renderer: prevent 'canvas' module resolution errors
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Deliberately omits script-src and default-src: Next.js ships inline
          // bootstrap scripts and the report print windows build their own inline
          // markup, so restricting those needs per-request nonces rather than a
          // static header. The directives below cost nothing and still remove
          // plugin embedding, <base> hijacking, off-site form posts and framing.
          {
            key: "Content-Security-Policy",
            value: [
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;