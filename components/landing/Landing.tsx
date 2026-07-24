'use client'
// Forkmap web landing — presents the product to a first-time visitor.
//
// Web build only (on native, `/` is the map — see app/page.tsx). It owns a
// full-bleed marketing layout: AppShell suppresses the app nav/offset here.
//
// Every phone shows a REAL screenshot of the app (public/landing/*.png), so the
// map, cards and screens match the app exactly. Copy is intentionally hardcoded
// French prose (standalone fr-only marketing surface, not app UI).
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { mapDeepLinkTarget } from '@/lib/landing'
import { GlobalFooter } from '@/components/ui/PageLayout'
import SiteHeader from '@/components/site/SiteHeader'
import PhoneFrame from './PhoneFrame'
import ShowcaseSection from './ShowcaseSection'
import { Reveal } from './useReveal'

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
      {/* ─── Nav ─── */}
      <SiteHeader />

      {/* ─── Hero ─── */}
      <section className="lp-wrap" style={{ paddingTop: 44, paddingBottom: 30 }}>
        <div
          className="lp-hero"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.05fr 0.95fr',
            alignItems: 'center',
            gap: 44,
          }}
        >
          <div
            className="lp-hero-copy"
            style={{ animation: 'lpUp 620ms var(--ease-out) backwards' }}
          >
            <span style={eyebrow}>Découverte de restaurants</span>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(34px, 5vw, 56px)',
                lineHeight: 1.04,
                letterSpacing: '-0.03em',
                fontWeight: 600,
                margin: '16px 0 0',
              }}
            >
              Un resto vu sur TikTok ?<br />
              Il est déjà dans ton carnet.
            </h1>
            <p
              style={{
                fontSize: 'clamp(15px, 1.6vw, 18px)',
                lineHeight: 1.6,
                color: 'var(--text-2)',
                margin: '20px 0 0',
                maxWidth: 480,
              }}
            >
              Partage la vidéo : Forkmap reconnaît le restaurant et le classe. Puis explore les
              meilleures tables autour de toi sur une carte vivante.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                margin: '30px 0 0',
              }}
            >
              <Link href="/carte" className="lp-cta" style={pillCta(true, true)}>
                Ouvrir la carte
                <ArrowRight size={17} strokeWidth={2} />
              </Link>
              <div style={{ display: 'flex', gap: 8 }}>
                <StoreBadge kind="apple" top="Télécharger sur" name="App Store" />
                <StoreBadge kind="play" top="Disponible sur" name="Google Play" />
              </div>
            </div>
          </div>

          <div
            className="lp-hero-device"
            style={{
              display: 'flex',
              justifyContent: 'center',
              animation: 'lpUp 720ms var(--ease-out) 90ms backwards',
            }}
          >
            <div className="lp-float">
              <PhoneFrame>
                <Image
                  src="/landing/app-map.png"
                  alt="L’application Forkmap : la carte des restaurants et la liste des meilleures adresses"
                  fill
                  sizes="288px"
                  priority
                  style={{ objectFit: 'cover' }}
                />
              </PhoneFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ─── L'import (flagship) ─── */}
      <ShowcaseSection
        id="import"
        kicker="L’import — la fonction phare"
        title="Un resto vu en vidéo, sauvé en un geste"
        body="La fonctionnalité qui n’existe nulle part ailleurs : depuis une vidéo, Forkmap retrouve le restaurant et le range pour toi."
        points={[
          'Partage depuis TikTok, Instagram, Reels ou YouTube',
          'Forkmap reconnaît le lieu, même si son nom n’est écrit nulle part',
          'Il atterrit dans ton carnet, avec sa note et ses infos',
        ]}
        img="/landing/app-import.png"
        alt="Une vidéo Instagram reconnue par Forkmap : le restaurant Kodawari Ramen, noté 9,1"
        phoneSide="left"
      />

      {/* ─── Découvrir / Surprends-moi (dark band) ─── */}
      <ShowcaseSection
        id="decouvrir"
        kicker="Découvrir"
        title="Tu hésites ? Laisse le concierge choisir"
        body="Une carte vivante de restaurants réels, notés et classés autour de toi — et quand tu ne sais pas quoi manger, « Surprends-moi » te propose une adresse taillée pour ton envie du moment."
        points={[
          'Les meilleures tables déjà triées, filtrées par cuisine, budget ou horaire',
          'Un deck qui apprend tes goûts : réconfort, healthy, festif, rapide',
        ]}
        img="/landing/app-decouvrir.png"
        alt="Le mode « Surprends-moi » de Forkmap propose une adresse — ici Bouillon Pigalle — selon ton envie"
        phoneSide="right"
        tone="dark"
      />

      {/* ─── Amis & carnet ─── */}
      <ShowcaseSection
        id="carnet"
        kicker="Ton carnet"
        title="Garde tes restos, partage-les"
        body="Tes découvertes, tes envies et tes souvenirs réunis au même endroit — et faciles à partager."
        points={[
          'Des listes pour tout, seul ou à plusieurs',
          'Suis tes amis et vois où ils ont mangé',
          'Consigne tes visites : note, dépenses et souvenirs',
        ]}
        img="/landing/app-favoris.png"
        alt="L’écran Enregistrés de Forkmap : imports, listes et restaurants sauvegardés"
        phoneSide="left"
      />

      {/* ─── Closing CTA ─── */}
      <section
        className="lp-wrap"
        style={{ paddingTop: 76, paddingBottom: 76, textAlign: 'center' }}
      >
        <Reveal>
          <h2 style={{ ...h2, fontSize: 'clamp(28px, 4vw, 44px)' }}>
            Ta prochaine bonne adresse t’attend.
          </h2>
          <p style={{ ...leadP, margin: '16px auto 0', maxWidth: 460 }}>
            Ouvre la carte, importe une vidéo, commence ton carnet. C’est gratuit.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
            <Link href="/carte" className="lp-cta" style={pillCta(true, true)}>
              Ouvrir la carte
              <ArrowRight size={17} strokeWidth={2} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ─── Footer ─── */}
      <GlobalFooter />

      <style>{`
        @keyframes lpUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lpFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .lp-float { animation: lpFloat 6s var(--ease-in-out) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lp-float, .lp-hero-copy, .lp-hero-device { animation: none !important; }
        }
        @media (max-width: 900px) {
          .lp-hero, .lp-showcase { grid-template-columns: 1fr !important; gap: 32px !important; }
          .lp-hero-device, .lp-showcase-device { order: -1; }
        }
      `}</style>
    </div>
  )
}

// ── shared styles ──
const eyebrow: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--text-3)',
}
const h2: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(26px, 3.4vw, 38px)',
  lineHeight: 1.1,
  letterSpacing: '-0.02em',
  fontWeight: 600,
  margin: '12px 0 0',
}
const leadP: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.6,
  color: 'var(--text-2)',
  margin: '16px 0 0',
}

function pillCta(filled: boolean, large = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: large ? '14px 24px' : '10px 18px',
    borderRadius: 999,
    fontSize: large ? 15.5 : 14,
    fontWeight: 600,
    fontFamily: 'var(--font-body)',
    textDecoration: 'none',
    cursor: 'pointer',
    background: filled ? 'var(--accent)' : 'transparent',
    color: filled ? 'var(--on-accent)' : 'var(--accent)',
    border: filled ? 'none' : '1.5px solid var(--border-strong)',
    boxShadow: filled ? 'var(--s-accent)' : 'none',
  }
}

// Store badges — shown "as launched". Until real store URLs exist they open the
// live web map, so nothing is a dead end and there's no "coming soon".
function StoreBadge({ kind, top, name }: { kind: 'apple' | 'play'; top: string; name: string }) {
  return (
    <Link
      href="/carte"
      aria-label={`${top} ${name}`}
      className="lp-cta"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        borderRadius: 12,
        background: 'var(--accent)',
        color: 'var(--on-accent)',
        textDecoration: 'none',
        lineHeight: 1.1,
      }}
    >
      <span style={{ display: 'flex', flexShrink: 0 }}>
        {kind === 'apple' ? <AppleMark /> : <PlayMark />}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 9, fontWeight: 500, opacity: 0.85 }}>{top}</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em' }}>{name}</span>
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
