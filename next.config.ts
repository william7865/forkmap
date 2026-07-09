// next.config.ts
import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'
// Set NEXT_EXPORT=true when building the static bundle for Capacitor
const isExport = process.env.NEXT_EXPORT === 'true'

const nextConfig: NextConfig = {
  ...(isExport && {
    output: 'export',
    trailingSlash: true,
  }),

  async headers() {
    // headers() is ignored by Next.js in static export mode
    if (isExport) return []
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // No plugins, no <base> hijacking, no form posts to third parties.
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://unpkg.com`,
              "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://fastly.4sqi.net https://*.4sqi.net https://*.googleusercontent.com https://*.basemaps.cartocdn.com https://unpkg.com https://upload.wikimedia.org https://commons.wikimedia.org",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://overpass-api.de https://api.foursquare.com https://router.project-osrm.org https://overpass.kumi.systems https://overpass.openstreetmap.ru https://maps.mail.ru",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      // CORS for Capacitor WebView origins
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
        ],
      },
    ]
  },

  images: {
    unoptimized: isExport,
    remotePatterns: [
      { protocol: 'https', hostname: 'fastly.4sqi.net' },
      { protocol: 'https', hostname: '**.4sqi.net' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'commons.wikimedia.org' },
      // Our own image proxy. A mobile build stamps this absolute origin into the
      // photo prefixes it saves in place snapshots, so a snapshot rendered later on
      // the web hands next/image a forkmap.vercel.app URL. Without this entry that
      // throws "Invalid src prop" and takes the page down.
      { protocol: 'https', hostname: 'forkmap.vercel.app', pathname: '/api/places/**' },
    ],
  },

  webpack: (config) => {
    config.resolve.fallback = { ...config.resolve.fallback, fs: false }
    return config
  },
}

export default nextConfig
