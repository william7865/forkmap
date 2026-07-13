// Server component — generateStaticParams is required for the static export (mobile build).
// On the web this is the import's real, linkable route: /import/<uuid>.
// The native app is a static export and cannot serve an id it never pre-rendered,
// so in the app the same screen is reached at /import?id=<uuid> (see ImportsRow →
// importHref). Both routes render the very same component.
import { Suspense } from 'react'
import ImportDetail from '@/components/import/ImportDetail'

export function generateStaticParams() {
  return [{ id: '__placeholder__' }]
}

export default function ImportDetailPage() {
  return (
    <Suspense fallback={null}>
      <ImportDetail />
    </Suspense>
  )
}
