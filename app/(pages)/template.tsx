'use client'
// A template (unlike a layout) re-mounts on every navigation into this route
// group, so its entrance animation replays each time — giving the secondary
// screens (Enregistrés, Compte, Amis…) a soft fade-in as you switch tabs. The
// map at the app root is deliberately outside this group: it must not re-mount
// (and re-init Leaflet) on every visit. Reduced-motion neutralises the fade.
// `backwards`, NOT `both`. `fadeIn` animates opacity, and an element whose
// opacity is animated keeps a STACKING CONTEXT for as long as the animation
// applies — which `forwards` (inside `both`) makes permanent. That context
// trapped every full-screen overlay opened from these pages: ChatThread's
// z-index 1500 was clamped inside this wrapper (z-index auto), so the tab bar
// at z-index 200 painted over it and swallowed the message composer.
// `fadeIn` ends at opacity 1 — the natural state — so `forwards` bought nothing.
import type { ReactNode } from 'react'

export default function PagesTemplate({ children }: { children: ReactNode }) {
  return (
    <div style={{ animation: 'fadeIn 300ms var(--ease-out) backwards', minHeight: '100%' }}>
      {children}
    </div>
  )
}
