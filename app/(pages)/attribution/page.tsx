// ============================================================
// app/(pages)/attribution/page.tsx — Data Attribution
// Required by the ODbL licence when using OpenStreetMap data.
// ============================================================

import type { Metadata } from 'next'
import { InfoPage } from '@/components/ui/PageLayout'

export const metadata: Metadata = {
  title: 'Attribution des données — Forkmap',
  description: 'Attribution des sources de données utilisées par Forkmap.',
}

export default function AttributionPage() {
  const sources = [
    {
      name: 'OpenStreetMap',
      badge: 'ODbL',
      badgeColor: '#1a56c4',
      badgeBg: 'rgba(66,133,244,0.08)',
      desc: 'Les emplacements, noms, adresses, horaires d’ouverture, types de cuisine et numéros de téléphone des restaurants proviennent d’OpenStreetMap, une carte du monde maintenue par la communauté.',
      credit: '© les contributeurs d’OpenStreetMap',
      licence: 'Licence Open Database (ODbL)',
      licenceUrl: 'https://opendatacommons.org/licenses/odbl/',
      href: 'https://www.openstreetmap.org',
    },
    {
      name: 'Wikidata / Wikipedia',
      url: 'https://www.wikidata.org',
      icon: '🌐',
      desc: 'Descriptions, étoiles Michelin, extraits Wikipédia et distinctions via l’API SPARQL de Wikidata et l’API REST de Wikipédia. Libre, ouvert et illimité.',
      credit: 'Wikimedia Foundation',
      licence: 'CC0 / CC BY-SA',
    },
    {
      name: 'Foursquare Places',
      badge: 'API',
      badgeColor: '#0f6c52',
      badgeBg: 'rgba(15,108,82,0.08)',
      desc: 'Les notes, le nombre d’avis, les niveaux de prix et les catégories sont enrichis via l’API Foursquare Places.',
      credit: 'Foursquare',
      licence: 'Conditions d’utilisation de Foursquare',
      licenceUrl: 'https://foursquare.com/legal/terms',
      href: 'https://developer.foursquare.com',
    },
    {
      name: 'OSRM',
      badge: 'Itinéraires',
      badgeColor: '#7c3aed',
      badgeBg: 'rgba(124,58,237,0.07)',
      desc: 'Les calculs d’itinéraire (à pied, à vélo, en voiture) sont assurés par l’Open Source Routing Machine, basé sur les données routières d’OpenStreetMap.',
      credit: '© les contributeurs d’OSRM',
      licence: 'BSD 2-Clause',
      licenceUrl: 'https://github.com/Project-OSRM/osrm-backend/blob/master/LICENSE.TXT',
      href: 'https://project-osrm.org',
    },
    {
      name: 'Nominatim',
      badge: 'Géocodage',
      badgeColor: '#92400e',
      badgeBg: 'rgba(146,64,14,0.07)',
      desc: 'La conversion d’adresse en coordonnées (géocodage) utilise Nominatim, un géocodeur open source basé sur les données d’OpenStreetMap.',
      credit: '© Nominatim / les contributeurs d’OpenStreetMap',
      licence: 'ODbL',
      licenceUrl: 'https://opendatacommons.org/licenses/odbl/',
      href: 'https://nominatim.openstreetmap.org',
    },
    {
      name: 'Leaflet',
      badge: 'Bibliothèque cartographique',
      badgeColor: '#166534',
      badgeBg: 'rgba(22,101,52,0.07)',
      desc: 'La carte interactive est affichée avec Leaflet, une bibliothèque cartographique JavaScript open source.',
      credit: '© les contributeurs de Leaflet',
      licence: 'BSD 2-Clause',
      licenceUrl: 'https://github.com/Leaflet/Leaflet/blob/main/LICENSE',
      href: 'https://leafletjs.com',
    },
  ]

  return (
    <InfoPage headerLabel="Attribution des données">
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: 'var(--ink)',
          margin: '0 0 8px',
        }}
      >
        Attribution des données
      </h1>
      <p style={{ fontSize: 14, color: 'var(--ink-60)', margin: '0 0 36px', lineHeight: 1.7 }}>
        Forkmap repose sur des données ouvertes provenant des fournisseurs ci-dessous. Nous
        remercions ces projets et leurs contributeurs.
      </p>

      {/* OSM required notice */}
      <div
        style={{
          background: 'rgba(26,86,196,0.06)',
          border: '1px solid rgba(26,86,196,0.15)',
          borderRadius: 12,
          padding: '14px 18px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1a56c4"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ flexShrink: 0, marginTop: 1 }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <p style={{ margin: 0, fontSize: 13, color: '#1a4a9e', lineHeight: 1.65 }}>
          <strong>L’attribution d’OpenStreetMap est légalement obligatoire</strong> au titre de la
          licence Open Database (ODbL). Toute application utilisant les données d’OpenStreetMap doit
          créditer «&nbsp;© les contributeurs d’OpenStreetMap&nbsp;» à un endroit visible.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {sources.map((src) => (
          <div
            key={src.name}
            style={{
              background: 'var(--white)',
              border: '1px solid rgba(28,25,23,0.07)',
              borderRadius: 14,
              padding: '18px 20px',
              boxShadow: '0 1px 4px rgba(28,25,23,0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: 'var(--ink)',
                  }}
                >
                  {src.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    color: src.badgeColor,
                    background: src.badgeBg,
                  }}
                >
                  {src.badge}
                </span>
              </div>
              <a
                href={src.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--forest-mid)',
                  textDecoration: 'none',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                Site web →
              </a>
            </div>
            <p
              style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-80)', lineHeight: 1.65 }}
            >
              {src.desc}
            </p>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: 'var(--ink-60)', fontWeight: 500 }}>
                Crédit : <strong style={{ color: 'var(--ink-80)' }}>{src.credit}</strong>
              </span>
              <a
                href={src.licenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 12,
                  color: 'var(--forest-mid)',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Licence : {src.licence} →
              </a>
            </div>
          </div>
        ))}
      </div>
    </InfoPage>
  )
}
