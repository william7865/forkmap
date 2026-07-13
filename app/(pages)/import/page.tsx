// The import detail, reached as /import?id=<uuid>.
//
// This is the route the NATIVE app uses: the app ships a static export (webDir:
// 'out'), which can only serve paths pre-rendered at build time — and an import's
// uuid is only known at runtime. This shell is pre-rendered once and reads the id
// from the query string. The web keeps the clean /import/[id] path.
import { Suspense } from 'react'
import ImportDetail from '@/components/import/ImportDetail'

export default function ImportQueryPage() {
  // useSearchParams (inside ImportDetail) must sit under a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <ImportDetail />
    </Suspense>
  )
}
