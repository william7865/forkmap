// Server component — generateStaticParams is required for the static export (mobile build).
// On the web (Vercel) this route renders the shared PublicProfile from the URL param.
// In the native app, the public profile is shown as an in-app OVERLAY (see FriendsView),
// NOT via this route — so the static export only needs a placeholder shell.
import PublicProfile from '@/components/social/PublicProfile'

export function generateStaticParams() {
  return [{ username: '__placeholder__' }]
}

export default function PublicProfilePage() {
  return <PublicProfile />
}
