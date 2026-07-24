import type { Metadata } from 'next'
import Link from 'next/link'
import { InfoPage } from '@/components/ui/PageLayout'

export const metadata: Metadata = {
  title: 'À propos · Forkmap',
  description: "Ce qu'est Forkmap, comment ça marche et qui l'a créé.",
}

const CAPABILITIES = [
  {
    title: 'Filtrez par qualité',
    desc: "Filtrez par note, prix, cuisine et horaires d'ouverture. Triez par distance, score ou nom.",
  },
  {
    title: "Obtenez l'itinéraire",
    desc: "Calculez votre trajet à pied, à vélo, en transports ou en voiture jusqu'à n'importe quel restaurant, directement depuis l'application.",
  },
  {
    title: 'Enregistrez vos favoris',
    desc: 'Gardez les adresses que vous aimez ou que vous voulez visiter. Votre liste se synchronise sur tous vos appareils.',
  },
  {
    title: 'Définissez votre position',
    desc: 'Utilisez votre GPS, saisissez une adresse ou placez un repère où vous voulez sur la carte comme point de départ.',
  },
  {
    title: 'Recherchez instantanément',
    desc: 'Cherchez par nom ou type de cuisine. Les résultats se mettent à jour en temps réel pendant que vous tapez.',
  },
]

export default function AboutPage() {
  return (
    <InfoPage>
      {/* Hero */}
      <div className="anim-slide-up" style={{ marginBottom: 40 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-pill)',
            padding: '4px 14px',
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-2)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Gratuit · Sans publicité
          </span>
        </div>
        <h1
          style={{
            margin: '0 0 16px',
            fontSize: 'clamp(28px, 7vw, 36px)',
            fontWeight: 600,
            letterSpacing: '-0.05em',
            color: 'var(--text)',
            lineHeight: 1.2,
            maxWidth: 480,
            textWrap: 'balance',
          }}
        >
          Trouvez les meilleures adresses où manger, partout.
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            color: 'var(--text-2)',
            lineHeight: 1.75,
            maxWidth: 560,
          }}
        >
          Forkmap est né d&apos;une conviction simple&nbsp;: trouver un bon resto ne devrait pas
          dépendre d&apos;un algorithme publicitaire.
        </p>
      </div>

      {/* Capabilities — map promoted as a capability hero, the other five as prose */}
      <div style={{ marginBottom: 56 }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-xl)',
            // The measure is held by the children's maxWidth, not by a fixed right gutter,
            // which used to squeeze the text into a 250px column on a phone.
            padding: 'clamp(24px, 5vw, 40px)',
            marginBottom: 40,
          }}
        >
          <p
            style={{
              margin: '0 0 16px',
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(21px, 4.2vw, 26px)',
              lineHeight: 1.4,
              color: 'var(--text)',
              maxWidth: 560,
              textWrap: 'balance',
            }}
          >
            Ouvrez la carte&nbsp;: chaque point est un lieu réel, pas un résultat sponsorisé.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: 'var(--text-2)',
              lineHeight: 1.75,
              maxWidth: 495,
            }}
          >
            Déplacez-vous, zoomez, et découvrez les restaurants d&apos;un quartier au fur et à
            mesure qu&apos;ils apparaissent, sans liste figée ni recherche à relancer.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            columnGap: 40,
            rowGap: 28,
          }}
        >
          {CAPABILITIES.map((item) => (
            <p
              key={item.title}
              style={{ margin: 0, fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.75 }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.title}.</span>{' '}
              {item.desc}
            </p>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)',
          padding: '28px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3
            style={{
              margin: '0 0 6px',
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
            }}
          >
            Prêt à explorer&nbsp;?
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
            Ouvrez la carte et partez à la découverte des restaurants autour de vous.
          </p>
        </div>
        <Link
          href="/carte"
          style={{
            padding: '11px 24px',
            borderRadius: 'var(--r-md)',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: 'var(--s-accent)',
            flexShrink: 0,
            transition: 'background 120ms',
          }}
        >
          Ouvrir la carte →
        </Link>
      </div>
    </InfoPage>
  )
}
