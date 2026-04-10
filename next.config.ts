// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Foursquare photos
      { protocol: "https", hostname: "fastly.4sqi.net" },
      { protocol: "https", hostname: "**.4sqi.net" },
    ],
  },
  // Ensure Leaflet doesn't break on SSR
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

export default nextConfig;
