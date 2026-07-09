// ============================================================
// app/(pages)/attribution/page.tsx — Data Attribution
// Required by the ODbL licence when using OpenStreetMap data.
// The only page on the site that names our data providers.
// ============================================================

import type { Metadata } from 'next'
import { InfoPage } from '@/components/ui/PageLayout'

export const metadata: Metadata = {
  title: 'Attribution des données · Forkmap',
  description: 'Attribution des sources de données utilisées par Forkmap.',
}

type Source = {
  name: string
  badge: string
  desc: string
  credit: string
  licence: string
  licenceUrl: string
  href: string
}

const SOURCES: Source[] = [
  {
    name: 'OpenStreetMap',
    badge: 'Cartographie',
    desc: 'Les emplacements, noms, adresses, horaires d’ouverture, types de cuisine et numéros de téléphone des restaurants proviennent d’OpenStreetMap, une carte du monde maintenue par la communauté.',
    credit: '© les contributeurs d’OpenStreetMap',
    licence: 'Licence Open Database (ODbL)',
    licenceUrl: 'https://opendatacommons.org/licenses/odbl/',
    href: 'https://www.openstreetmap.org',
  },
  {
    name: 'CARTO',
    badge: 'Fond de carte',
    desc: 'Le fond de carte (tuiles « Voyager ») est fourni par CARTO, à partir des données d’OpenStreetMap.',
    credit: '© CARTO, © les contributeurs d’OpenStreetMap',
    licence: 'Conditions d’utilisation de CARTO',
    licenceUrl: 'https://carto.com/legal/',
    href: 'https://carto.com/attributions',
  },
  {
    name: 'Wikidata et Wikipédia',
    badge: 'Encyclopédie',
    desc: 'Descriptions, étoiles Michelin, extraits Wikipédia et distinctions, via l’API SPARQL de Wikidata et l’API REST de Wikipédia.',
    credit: 'Wikimedia Foundation',
    licence: 'CC0 et CC BY SA',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    href: 'https://www.wikidata.org',
  },
  {
    name: 'Foursquare Places',
    badge: 'Notes et avis',
    desc: 'Les notes, le nombre d’avis, les niveaux de prix et les catégories sont enrichis via l’API Foursquare Places.',
    credit: 'Foursquare',
    licence: 'Conditions d’utilisation de Foursquare',
    licenceUrl: 'https://foursquare.com/legal/terms',
    href: 'https://developer.foursquare.com',
  },
  {
    name: 'OSRM',
    badge: 'Itinéraires',
    desc: 'Les calculs d’itinéraire (à pied, à vélo, en voiture) sont assurés par OSRM, basé sur les données routières d’OpenStreetMap.',
    credit: '© les contributeurs d’OSRM',
    licence: 'BSD',
    licenceUrl: 'https://github.com/Project-OSRM/osrm-backend/blob/master/LICENSE.TXT',
    href: 'https://project-osrm.org',
  },
  {
    name: 'Nominatim',
    badge: 'Géocodage',
    desc: 'La conversion d’adresse en coordonnées (géocodage) utilise Nominatim, un géocodeur basé sur les données d’OpenStreetMap.',
    credit: '© Nominatim, © les contributeurs d’OpenStreetMap',
    licence: 'Licence Open Database (ODbL)',
    licenceUrl: 'https://opendatacommons.org/licenses/odbl/',
    href: 'https://nominatim.openstreetmap.org',
  },
  {
    name: 'Leaflet',
    badge: 'Carte interactive',
    desc: 'La carte interactive est affichée avec Leaflet, une bibliothèque cartographique JavaScript.',
    credit: '© les contributeurs de Leaflet',
    licence: 'BSD',
    licenceUrl: 'https://github.com/Leaflet/Leaflet/blob/main/LICENSE',
    href: 'https://leafletjs.com',
  },
]

const linkStyle = { color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 } as const

export default function AttributionPage() {
  return (
    <InfoPage headerLabel="Attribution des données">
      <div className="anim-slide-up" style={{ marginBottom: 40 }}>
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
          Attribution des données
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
          Forkmap ne possède ni ne crée les données des restaurants. Voici qui les produit, et sous
          quelles conditions nous les affichons.
        </p>
      </div>

      {/* ODbL notice — legally required, so it stays visible, but in the house palette */}
      <p
        style={{
          margin: '0 0 48px',
          padding: '18px 22px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          fontSize: 13.5,
          color: 'var(--text-2)',
          lineHeight: 1.75,
          maxWidth: 560,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
          Créditer OpenStreetMap est une obligation légale
        </span>{' '}
        au titre de la licence Open Database. Toute application qui affiche ces données doit
        mentionner «&nbsp;© les contributeurs d’OpenStreetMap&nbsp;» à un endroit visible.
      </p>

      <div style={{ display: 'grid', gap: 32 }}>
        {SOURCES.map((src) => (
          <p
            key={src.name}
            style={{
              margin: 0,
              fontSize: 13.5,
              color: 'var(--text-2)',
              lineHeight: 1.75,
              maxWidth: 560,
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{src.name}</span>{' '}
            <span style={{ color: 'var(--text-3)', fontSize: 12 }}>· {src.badge} ·</span> {src.desc}{' '}
            <a href={src.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>
              Site web →
            </a>
            <br />
            <span style={{ color: 'var(--text-3)', fontSize: 12.5 }}>
              {src.credit} ·{' '}
              <a href={src.licenceUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                {src.licence} →
              </a>
            </span>
          </p>
        ))}
      </div>
    </InfoPage>
  )
}
