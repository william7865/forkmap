// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://fastly.4sqi.net https://*.4sqi.net https://*.googleusercontent.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://overpass-api.de https://api.foursquare.com https://router.project-osrm.org https://overpass.kumi.systems https://overpass.openstreetmap.ru https://maps.mail.ru",
              "font-src 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      // Foursquare photos
      { protocol: "https", hostname: "fastly.4sqi.net" },
      { protocol: "https", hostname: "**.4sqi.net" },
      // Google OAuth avatars
      { protocol: "https", hostname: "*.googleusercontent.com" },
    ],
  },
  // Ensure Leaflet doesn't break on SSR
  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

export default nextConfig;
