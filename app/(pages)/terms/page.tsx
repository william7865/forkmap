// ============================================================
// app/(pages)/terms/page.tsx — Terms of Service
// ============================================================

import type { Metadata } from 'next'
import { InfoPage } from '@/components/ui/PageLayout'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Conditions d’utilisation — Forkmap',
  description: 'Conditions d’utilisation de Forkmap.',
}

export default function TermsPage() {
  return (
    <InfoPage headerLabel="Conditions d’utilisation">
      <h1
        style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: 'var(--ink)',
          margin: '0 0 8px',
        }}
      >
        Conditions d’utilisation
      </h1>
      <p style={{ fontSize: 13, color: 'var(--ink-60)', margin: '0 0 40px' }}>
        Dernière mise à jour : mars 2026
      </p>

      <Section title="Acceptation des conditions">
        <p>
          En utilisant Forkmap, vous acceptez les présentes conditions. Si vous ne les acceptez pas,
          veuillez ne pas utiliser l’application.
        </p>
      </Section>
      <Section title="Ce qu’est Forkmap">
        <p>
          Forkmap est un outil de découverte de restaurants qui agrège des données publiquement
          disponibles provenant d’OpenStreetMap et de Foursquare. Il est fourni en l’état, à titre
          informatif uniquement.
        </p>
      </Section>
      <Section title="Votre compte">
        <p>
          Vous êtes responsable du maintien de la sécurité de vos identifiants de compte. Vous ne
          devez pas utiliser Forkmap à des fins illégales ou nuisibles. Vous devez avoir au moins 13
          ans pour créer un compte.
        </p>
      </Section>
      <Section title="Exactitude des données">
        <p>
          Les données sur les restaurants proviennent d’OpenStreetMap, dont le contenu est maintenu
          par la communauté. Nous ne garantissons pas l’exactitude, l’exhaustivité ou l’actualité
          des informations sur les restaurants. Vérifiez toujours les informations essentielles
          (horaires d’ouverture, adresse) directement auprès du restaurant.
        </p>
      </Section>
      <Section title="Propriété intellectuelle">
        <p>
          L’interface, le code et l’identité visuelle de Forkmap sont notre propriété. Les données
          sur les restaurants sont © les contributeurs d’OpenStreetMap sous{' '}
          <a
            href="https://opendatacommons.org/licenses/odbl/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#e05a1e' }}
          >
            licence ODbL
          </a>
          . Les données d’évaluation sont fournies par Foursquare.
        </p>
      </Section>
      <Section title="Limitation de responsabilité">
        <p>
          Forkmap est fourni &quot;en l’état&quot; sans garantie d’aucune sorte. Nous ne sommes pas
          responsables des dommages résultant de votre utilisation de l’application, de votre
          confiance dans les données sur les restaurants, ou de toute interruption du service.
        </p>
      </Section>
      <Section title="Résiliation">
        <p>
          Nous nous réservons le droit de suspendre ou de résilier votre compte à tout moment en cas
          de violation des présentes conditions. Vous pouvez supprimer votre compte à tout moment
          depuis les{' '}
          <Link href="/settings" style={{ color: '#e05a1e' }}>
            Paramètres
          </Link>
          .
        </p>
      </Section>
      <Section title="Modifications des présentes conditions">
        <p>
          Nous pouvons mettre à jour ces conditions de temps à autre. L’utilisation continue de
          Forkmap après des modifications vaut acceptation des nouvelles conditions.
        </p>
      </Section>
      <Section title="Contact">
        <p>
          Des questions ? Utilisez la{' '}
          <Link href="/contact" style={{ color: '#e05a1e' }}>
            page Contact
          </Link>{' '}
          ou écrivez à{' '}
          <a href="mailto:hello@forkmap.app" style={{ color: '#e05a1e' }}>
            hello@forkmap.app
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
