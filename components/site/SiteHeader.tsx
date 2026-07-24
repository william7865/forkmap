'use client'
// Shared marketing-site header — used by the landing AND every public content
// page (À propos, Aide, Contact, légales). One header, one wordmark, so the whole
// public web reads as a single site rather than the app's NavRail bleeding in.
//
// Web-only: on native these pages render InfoPage's history.back button instead,
// and the landing never renders on native at all.
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ForkmapWordmark } from '@/components/ui/Brand'

// Section anchors live on the landing; prefixing with `/` makes them work from a
// sub-page too (jump back to `/` then scroll to the section).
const NAV_LINKS = [
  { href: '/#import', label: "L'import" },
  { href: '/#decouvrir', label: 'Découvrir' },
  { href: '/#carnet', label: 'Amis & carnet' },
]

export default function SiteHeader() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <nav
        className="lp-wrap"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 62,
        }}
      >
        <ForkmapWordmark />

        <div className="lp-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="lp-navlink"
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--text-2)',
                textDecoration: 'none',
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <Link
          href="/carte"
          className="lp-cta"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            borderRadius: 999,
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            textDecoration: 'none',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            border: 'none',
            boxShadow: 'var(--s-accent)',
          }}
        >
          Ouvrir la carte
          <ArrowRight size={15} strokeWidth={2} />
        </Link>
      </nav>
    </header>
  )
}
