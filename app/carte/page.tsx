// /carte — the live map on the web. Native keeps the map at `/` (see app/page.tsx),
// so this route exists only for the web build, reached from the landing's CTA and
// from the deep-link guard that forwards shared `/?select=…` links here.
//
// Deliberately OUTSIDE the app/(pages) group: like `/`, the map wants only the
// root layout (full-height canvas), not any nested page chrome.
import type { Metadata } from 'next'
import MapHome from '@/components/home/MapHome'

export const metadata: Metadata = {
  title: 'Carte · Forkmap',
}

export default function CartePage() {
  return <MapHome />
}
