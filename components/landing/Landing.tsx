'use client'
// Forkmap web landing — presents the product to a first-time visitor.
//
// Web build only (on native, `/` is the map — see app/page.tsx). It owns a
// full-bleed marketing layout: AppShell suppresses the app nav/offset here.
//
// Every phone shows a REAL screenshot of the app (public/landing/*.png), so the
// map, cards and screens match the app exactly. Copy is intentionally hardcoded
// French prose (standalone fr-only marketing surface, not app UI).
//
// Art direction: chaque section a sa propre composition (séquence verticale →
// plein écran centré → rythme horizontal). Une landing qui répète la même
// bande « téléphone + titre + puces » trois fois bat la mesure ; ici la forme
// de chaque section dit ce que la section raconte. Le vocabulaire (monochrome,
// Playfair + Inter, l'or réservé à la note) ne bouge pas.
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { mapDeepLinkTarget } from '@/lib/landing'
import { GlobalFooter } from '@/components/ui/PageLayout'
import SiteHeader from '@/components/site/SiteHeader'
import PhoneFrame from './PhoneFrame'
import ImportSection from './sections/ImportSection'
import DiscoverSection from './sections/DiscoverSection'
import NotebookSection from './sections/NotebookSection'

export default function Landing() {
  const router = useRouter()

  // Shared app deep-links (/?select=…, /?auth=required, /?surprise=1) are authored
  // against `/`, which on the web is this landing. Forward them to the map.
  useEffect(() => {
    const target = mapDeepLinkTarget(window.location.search)
    if (target) router.replace(target)
  }, [router])

  return (
    <div
      style={{
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: 'var(--font-body)',
        overflowX: 'hidden',
      }}
    >
      <SiteHeader />

      {/* ─── Hero ─── */}
      <section className="lp-wrap lp-hero-sec">
        <div className="lp-hero">
          <div className="lp-hero-copy">
            {/* Le titre se lève ligne par ligne derrière un masque : c'est LE
               moment orchestré de la page, et il ne se rejoue jamais. */}
            <h1 className="lp-h1">
              <span className="lp-line">
                <span className="lp-line-in" style={{ '--i': 0 } as React.CSSProperties}>
                  Un resto vu sur TikTok ?
                </span>
              </span>
              <span className="lp-line">
                <span className="lp-line-in" style={{ '--i': 1 } as React.CSSProperties}>
                  Il est déjà dans ton carnet.
                </span>
              </span>
            </h1>

            <p
              className="lp-lead lp-hero-in"
              style={{ '--i': 2, maxWidth: 470, marginTop: 24 } as React.CSSProperties}
            >
              Partage la vidéo : Forkmap reconnaît le restaurant et le classe. Puis explore les
              meilleures tables autour de toi sur une carte vivante.
            </p>

            {/* Une seule action primaire. Les stores sont secondaires — trois
               pilules noires identiques, c'était trois fois rien. */}
            <div className="lp-actions lp-hero-in" style={{ '--i': 3 } as React.CSSProperties}>
              <Link href="/carte" className="lp-cta lp-cta-primary">
                Ouvrir la carte
                <ArrowRight size={17} strokeWidth={2} />
              </Link>
              <div className="lp-stores">
                <StoreBadge kind="apple" top="Télécharger sur" name="App Store" />
                <StoreBadge kind="play" top="Disponible sur" name="Google Play" />
              </div>
            </div>

            <p className="lp-note lp-hero-in" style={{ '--i': 4 } as React.CSSProperties}>
              Gratuit, sans publicité — des lieux réels, pas des fiches sponsorisées.
            </p>
          </div>

          <div className="lp-hero-device lp-hero-in" style={{ '--i': 2 } as React.CSSProperties}>
            <PhoneFrame width={306}>
              <Image
                src="/landing/app-map.png"
                alt="L’application Forkmap : la carte des restaurants et la liste des meilleures adresses"
                fill
                sizes="306px"
                priority
                style={{ objectFit: 'cover' }}
              />
            </PhoneFrame>
          </div>
        </div>
      </section>

      <ImportSection />
      <DiscoverSection />
      <NotebookSection />

      {/* ─── Clôture ─── Noire comme Découvrir, mais traitée à l'opposé :
          pas d'appareil, rien que la phrase et l'action. Même voix, autre forme. */}
      <section className="lp-dark lp-close">
        <div className="lp-wrap" style={{ textAlign: 'center' }}>
          <h2 className="lp-h2 lp-h2-dark" style={{ maxWidth: 11 * 46, marginInline: 'auto' }}>
            Ta prochaine bonne adresse t’attend.
          </h2>
          <p
            className="lp-lead lp-lead-dark"
            style={{ marginTop: 16, maxWidth: 420, marginInline: 'auto' }}
          >
            Ouvre la carte, importe une vidéo, commence ton carnet.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <Link href="/carte" className="lp-cta lp-cta-onDark">
              Ouvrir la carte
              <ArrowRight size={17} strokeWidth={2} />
            </Link>
          </div>
        </div>
      </section>

      <GlobalFooter />
    </div>
  )
}

// Store badges — shown "as launched". Until real store URLs exist they open the
// live web map, so nothing is a dead end and there's no "coming soon".
function StoreBadge({ kind, top, name }: { kind: 'apple' | 'play'; top: string; name: string }) {
  return (
    <Link href="/carte" aria-label={`${top} ${name}`} className="lp-cta lp-store">
      <span style={{ display: 'flex', flexShrink: 0 }}>
        {kind === 'apple' ? <AppleMark /> : <PlayMark />}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
        <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.7 }}>{top}</span>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.01em' }}>{name}</span>
      </span>
    </Link>
  )
}

function AppleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 12.53c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.1 8.79.73 1.06 1.6 2.25 2.74 2.21 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.08 2.65-2.15.84-1.23 1.18-2.42 1.2-2.48-.03-.01-2.29-.88-2.31-3.48zM14.87 6.07c.6-.74 1.01-1.76.9-2.78-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.69-.92 2.69.97.07 1.97-.49 2.58-1.22z" />
    </svg>
  )
}

function PlayMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.2 2.3c-.3.2-.5.6-.5 1.1v17.2c0 .5.2.9.5 1.1l9.3-9.7L4.2 2.3zm11 7.6L6.4 1.5l11.3 6.5-2.5 1.9zm0 4.2 2.5 1.9L6.4 22.5l8.8-8.4zM18.8 10.6l2.6 1.5c.6.4.6 1.4 0 1.8l-2.6 1.5-2.8-2.4 2.8-2.4z" />
    </svg>
  )
}
