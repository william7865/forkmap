// Root route — one entry, two faces.
//
// Native (Capacitor static export, NEXT_EXPORT=true): the app opens straight
// onto the map, exactly as before.
// Web (Vercel): visitors land on the marketing page that presents Forkmap; the
// live map lives at /carte (its "Ouvrir la carte" CTA).
//
// This is a server component so it can read NEXT_EXPORT (a build-time, non-public
// env var invisible to client bundles) and pick the branch at build time.
import MapHome from '@/components/home/MapHome'
import Landing from '@/components/landing/Landing'

const isExport = process.env.NEXT_EXPORT === 'true'

export default function Page() {
  return isExport ? <MapHome /> : <Landing />
}
