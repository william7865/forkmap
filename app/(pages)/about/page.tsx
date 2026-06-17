import type { Metadata } from 'next'
import Link from 'next/link'
import { InfoPage } from '@/components/ui/PageLayout'
import { IcoMap, IcoStar, IcoRoute, IcoHeart, IcoMapPin, IcoSearch } from '@/components/icons'

export const metadata: Metadata = {
  title: 'À propos · Forkmap',
  description: "Ce qu'est Forkmap, comment ça marche et qui l'a créé.",
}

export default function AboutPage() {
  return (
    <InfoPage headerLabel="À propos">
      {/* Hero */}
      <div style={{ marginBottom: 52 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(187,94,46,0.15)',
            border: '1px solid rgba(187,94,46,0.15)',
            borderRadius: 999,
            padding: '4px 14px',
            marginBottom: 18,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--forest)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Open source · Gratuit
          </span>
        </div>
        <h1
          style={{
            margin: '0 0 16px',
            fontSize: 36,
            fontWeight: 600,
            letterSpacing: '-0.05em',
            color: 'var(--ink)',
            lineHeight: 1.2,
          }}
        >
          Trouvez les meilleures adresses
          <br />
          où manger, partout.
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 16,
            color: 'var(--ink-80)',
            lineHeight: 1.75,
            maxWidth: 580,
          }}
        >
          Forkmap aide à trouver où manger, à partir de données ouvertes. Les lieux viennent
          d&apos;OpenStreetMap, les notes de Foursquare. Avec ça : une carte, des filtres et le
          calcul d&apos;itinéraire.
        </p>
      </div>

      {/* What you can do */}
      <Section title="Ce que vous pouvez faire">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 14,
          }}
        >
          {[
            {
              Icon: IcoMap,
              title: 'Explorez la carte',
              desc: 'Parcourez les restaurants sur une carte interactive. Déplacez-vous, zoomez et découvrez ce qui se trouve dans chaque quartier.',
            },
            {
              Icon: IcoStar,
              title: 'Filtrez par qualité',
              desc: "Filtrez par note, prix, cuisine et horaires d'ouverture. Triez par distance, score ou nom.",
            },
            {
              Icon: IcoRoute,
              title: "Obtenez l'itinéraire",
              desc: "Calculez votre trajet à pied, à vélo, en transports ou en voiture jusqu'à n'importe quel restaurant, directement depuis l'application.",
            },
            {
              Icon: IcoHeart,
              title: 'Enregistrez vos favoris',
              desc: 'Gardez les adresses que vous aimez ou que vous voulez visiter. Votre liste se synchronise sur tous vos appareils.',
            },
            {
              Icon: IcoMapPin,
              title: 'Définissez votre position',
              desc: 'Utilisez votre GPS, saisissez une adresse ou placez un repère où vous voulez sur la carte comme point de départ.',
            },
            {
              Icon: IcoSearch,
              title: 'Recherchez instantanément',
              desc: 'Cherchez par nom ou type de cuisine. Les résultats se mettent à jour en temps réel pendant que vous tapez.',
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: 'var(--white)',
                border: '1px solid var(--b1)',
                borderRadius: 14,
                padding: '18px 20px',
                boxShadow: '0 1px 4px rgba(28,25,23,0.05)',
              }}
            >
              <div style={{ marginBottom: 10, color: 'var(--accent)' }}>
                <item.Icon size={24} />
              </div>
              <h3
                style={{
                  margin: '0 0 6px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  letterSpacing: '-0.02em',
                }}
              >
                {item.title}
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-60)', lineHeight: 1.65 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* Data sources */}
      <Section title="Sources de données">
        <p style={{ fontSize: 14, color: 'var(--ink-80)', lineHeight: 1.75, marginBottom: 20 }}>
          Forkmap s&apos;appuie sur des sources de données ouvertes. Nous ne possédons ni ne créons
          les données des restaurants : nous les rassemblons, les enrichissons et les affichons.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            {
              name: 'OpenStreetMap',
              badge: 'ODbL',
              desc: "Emplacements, noms, adresses, horaires d'ouverture, cuisines et numéros de téléphone proviennent d'OpenStreetMap, une carte du monde sous licence ouverte, maintenue par sa communauté.",
              href: 'https://www.openstreetmap.org',
            },
            {
              name: 'Foursquare Places',
              badge: 'API',
              desc: "Les notes, le nombre d'avis, les niveaux de prix, les photos et les catégories sont enrichis grâce à l'API Foursquare Places.",
              href: 'https://developer.foursquare.com',
            },
            {
              name: 'OSRM',
              badge: 'Itinéraires',
              desc: "Le calcul des itinéraires (temps et tracés à pied, à vélo, en voiture ou en transports) est assuré par l'Open Source Routing Machine, qui s'appuie sur les données routières d'OpenStreetMap.",
              href: 'https://project-osrm.org',
            },
            {
              name: 'Nominatim',
              badge: 'Géocodage',
              desc: "La conversion d'une adresse en coordonnées (géocodage) utilise Nominatim, un géocodeur fondé sur OpenStreetMap.",
              href: 'https://nominatim.openstreetmap.org',
            },
          ].map((src) => (
            <div
              key={src.name}
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                padding: '16px 18px',
                background: 'var(--white)',
                border: '1px solid var(--b1)',
                borderRadius: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                    {src.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--ink-60)',
                      background: 'rgba(28,25,23,0.05)',
                      padding: '2px 8px',
                      borderRadius: 999,
                    }}
                  >
                    {src.badge}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-80)', lineHeight: 1.65 }}>
                  {src.desc}
                </p>
              </div>
              <a
                href={src.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--forest-mid)',
                  textDecoration: 'none',
                  marginTop: 2,
                }}
              >
                Site web →
              </a>
            </div>
          ))}
        </div>
      </Section>

      {/* Tech stack */}
      <Section title="Conçu avec">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            'Next.js 15',
            'TypeScript',
            'Leaflet.js',
            'Supabase',
            'Tailwind CSS',
            'Overpass API',
            'Foursquare API',
            'OSRM',
          ].map((tech) => (
            <span
              key={tech}
              style={{
                padding: '5px 13px',
                borderRadius: 999,
                background: 'var(--off-white)',
                border: '1px solid var(--b1)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ink-80)',
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <div
        style={{
          marginTop: 48,
          background: 'linear-gradient(135deg, rgba(187,94,46,0.15) 0%, rgba(187,94,46,0.04) 100%)',
          border: '1px solid rgba(187,94,46,0.15)',
          borderRadius: 18,
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
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '-0.03em',
              color: 'var(--ink)',
            }}
          >
            Prêt à explorer ?
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-60)' }}>
            Ouvrez la carte et partez à la découverte des restaurants autour de vous.
          </p>
        </div>
        <Link
          href="/"
          style={{
            padding: '11px 24px',
            borderRadius: 12,
            background: 'var(--forest-mid)',
            color: 'white',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 4px 16px rgba(187,94,46,0.15)',
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <h2
        style={{
          margin: '0 0 18px',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '-0.03em',
          color: 'var(--ink)',
          paddingBottom: 12,
          borderBottom: '1px solid rgba(28,25,23,0.06)',
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}
