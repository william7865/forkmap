'use client'
// A template (unlike a layout) re-mounts on every navigation into this route
// group, so its entrance animation replays each time — giving the secondary
// screens (Enregistrés, Compte, Amis…) a soft fade-in as you switch tabs. The
// map at the app root is deliberately outside this group: it must not re-mount
// (and re-init Leaflet) on every visit. Reduced-motion neutralises the fade.
import type { ReactNode } from 'react'

export default function PagesTemplate({ children }: { children: ReactNode }) {
  return (
    <div style={{ animation: 'fadeIn 300ms var(--ease-out) both', minHeight: '100%' }}>
      {children}
    </div>
  )
}
