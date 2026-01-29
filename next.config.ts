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
};

export default nextConfig;