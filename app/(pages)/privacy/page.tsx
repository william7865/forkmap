// ============================================================
// app/(pages)/privacy/page.tsx — Privacy Policy
// ============================================================

import type { Metadata } from 'next'
import { InfoPage } from '@/components/ui/PageLayout'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politique de confidentialité · Forkmap',
  description: 'Comment Forkmap collecte, utilise et protège vos données.',
}

export default function PrivacyPage() {
  return (
    <InfoPage headerLabel="Politique de confidentialité">
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: 'var(--ink)',
          margin: '0 0 8px',
        }}
      >
        Politique de confidentialité
      </h1>
      <p style={{ fontSize: 13, color: 'var(--ink-60)', margin: '0 0 40px' }}>
        Dernière mise à jour : mars 2026
      </p>

      <Section title="Qui sommes-nous">
        <p>
          Forkmap est une application de découverte de restaurants. Nous ne sommes affiliés ni à
          OpenStreetMap, ni à Foursquare, ni à aucun fournisseur de cartographie. La présente
          politique explique quelles données personnelles nous collectons et comment nous les
          utilisons.
        </p>
      </Section>
      <Section title="Données que nous collectons">
        <p>
          <strong>Données de compte :</strong> Si vous créez un compte, nous stockons votre adresse
          e-mail et vos identifiants d&apos;authentification (via Supabase Auth). Si vous vous
          connectez avec Google, nous recevons de Google votre nom, votre adresse e-mail et votre
          photo de profil.
        </p>
        <p>
          <strong>Lieux enregistrés :</strong> Lorsque vous ajoutez un restaurant à vos favoris,
          nous stockons dans notre base de données l&apos;identifiant OpenStreetMap, le nom et les
          coordonnées du restaurant.
        </p>
        <p>
          <strong>Données de localisation :</strong> Votre position est traitée dans votre
          navigateur pour centrer la carte. Nous ne stockons <strong>pas</strong> vos coordonnées
          GPS sur nos serveurs.
        </p>
        <p>
          <strong>Données d&apos;utilisation :</strong> Nous pouvons collecter des statistiques
          d&apos;utilisation anonymisées via les journaux serveur. Aucun outil d&apos;analyse tiers
          n&apos;est chargé.
        </p>
      </Section>
      <Section title="Comment nous utilisons vos données">
        <p>
          Nous utilisons vos données uniquement pour fournir les fonctionnalités de Forkmap : vous
          authentifier, synchroniser vos lieux enregistrés et afficher votre position sur la carte.
          Nous ne <strong>vendons pas</strong> et ne partageons pas vos données avec des annonceurs.
        </p>
      </Section>
      <Section title="Services tiers">
        <p>
          <strong>OpenStreetMap :</strong> Données des restaurants fournies sous{' '}
          <a
            href="https://opendatacommons.org/licenses/odbl/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)' }}
          >
            licence ODbL
          </a>
          .
        </p>
        <p>
          <strong>Foursquare :</strong> Notes et nombre d&apos;avis via l&apos;API Foursquare
          Places. Consultez la{' '}
          <a
            href="https://foursquare.com/legal/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)' }}
          >
            politique de confidentialité de Foursquare
          </a>
          .
        </p>
        <p>
          <strong>Supabase :</strong> Authentification et stockage de la base de données dans
          l&apos;UE. Consultez la{' '}
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)' }}
          >
            politique de confidentialité de Supabase
          </a>
          .
        </p>
        <p>
          <strong>OSRM :</strong> Calculs d&apos;itinéraires. Seules les coordonnées sont
          transmises, aucune donnée personnelle.
        </p>
      </Section>
      <Section title="Conservation des données">
        <p>
          Nous conservons vos données jusqu&apos;à ce que vous supprimiez votre compte. Vous pouvez
          le faire à tout moment depuis les{' '}
          <Link href="/settings" style={{ color: 'var(--accent)' }}>
            Paramètres
          </Link>
          .
        </p>
      </Section>
      <Section title="Vos droits">
        <p>
          Vous pouvez accéder à vos données, les rectifier ou les supprimer à tout moment. Écrivez à{' '}
          <a href="mailto:privacy@forkmap.app" style={{ color: 'var(--accent)' }}>
            privacy@forkmap.app
          </a>{' '}
          ou utilisez la{' '}
          <Link href="/contact" style={{ color: 'var(--accent)' }}>
            page Contact
          </Link>
          .
        </p>
      </Section>
      <Section title="Cookies">
        <p>
          Nous utilisons un unique cookie d&apos;authentification défini par Supabase pour vous
          garder connecté. Aucun cookie publicitaire ou de pistage n&apos;est utilisé.
        </p>
      </Section>
      <Section title="Contact">
        <p>
          Des questions sur cette politique ? Écrivez à{' '}
          <a href="mailto:privacy@forkmap.app" style={{ color: 'var(--accent)' }}>
            privacy@forkmap.app
          </a>
          .
        </p>
      </Section>
    </InfoPage>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <h2
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: 'var(--ink)',
          margin: '0 0 12px',
          paddingBottom: 8,
          borderBottom: '1px solid rgba(28,25,23,0.06)',
        }}
      >
        {title}
      </h2>
      <div
        style={{
          fontSize: 14,
          color: 'var(--ink-80)',
          lineHeight: 1.75,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {children}
      </div>
    </div>
  )
}
