// Server component — exports generateStaticParams required for static export (mobile build).
// The page itself is fully client-rendered via PublicProfilePageClient.
import PublicProfilePageClient from './PublicProfilePageClient'

// Static export (mobile build) requires at least one param so Next.js creates
// the route shell. The Capacitor app navigates client-side (router.push), so
// only this placeholder HTML file is bundled; real usernames render at runtime.
export function generateStaticParams() {
  return [{ username: '__placeholder__' }]
}

export default function PublicProfilePage() {
  return <PublicProfilePageClient />
}
