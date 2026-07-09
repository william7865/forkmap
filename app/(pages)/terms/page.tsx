// ============================================================
// app/(pages)/terms/page.tsx — Terms of Service
// ============================================================

import type { Metadata } from 'next'
import { InfoPage, LegalSection } from '@/components/ui/PageLayout'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Conditions d’utilisation · Forkmap',
  description: 'Conditions d’utilisation de Forkmap.',
}

export default function TermsPage() {
  return (
    <InfoPage headerLabel="Conditions d’utilisation">
      <h1
        style={{
          fontSize: 'clamp(28px, 7vw, 36px)',
          fontWeight: 600,
          letterSpacing: '-0.05em',
          color: 'var(--text)',
          margin: '0 0 16px',
          lineHeight: 1.2,
          maxWidth: 480,
          textWrap: 'balance',
        }}
      >
        Conditions d’utilisation
      </h1>
      <p
        style={{
          fontSize: 16,
          color: 'var(--text-2)',
          lineHeight: 1.75,
          margin: '0 0 12px',
          maxWidth: 560,
        }}
      >
        Les règles du jeu : ce que Forkmap vous propose, ce qu’il ne garantit pas, et ce qu’on
        attend de vous.
      </p>
      <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '0 0 56px' }}>
        Dernière mise à jour : juillet 2026
      </p>

      <LegalSection title="Acceptation des conditions">
        <p>
          En utilisant Forkmap, vous acceptez les présentes conditions. Si vous ne les acceptez pas,
          veuillez ne pas utiliser l’application.
        </p>
      </LegalSection>
      <LegalSection title="Ce qu’est Forkmap">
        <p>
          Forkmap est un outil de découverte de restaurants qui agrège des données publiquement
          disponibles. Il est fourni en l’état, à titre informatif uniquement.
        </p>
      </LegalSection>
      <LegalSection title="Votre compte">
        <p>
          Vous êtes responsable du maintien de la sécurité de vos identifiants de compte. Vous ne
          devez pas utiliser Forkmap à des fins illégales ou nuisibles. Vous devez avoir au moins 13
          ans pour créer un compte.
        </p>
      </LegalSection>
      <LegalSection title="Exactitude des données">
        <p>
          Les données sur les restaurants proviennent de sources publiques maintenues par leurs
          communautés. Nous ne garantissons pas l’exactitude, l’exhaustivité ou l’actualité des
          informations sur les restaurants. Vérifiez toujours les informations essentielles
          (horaires d’ouverture, adresse) directement auprès du restaurant.
        </p>
      </LegalSection>
      <LegalSection title="Propriété intellectuelle">
        <p>
          L’interface, le code et l’identité visuelle de Forkmap sont notre propriété. Les données
          sur les restaurants restent la propriété de leurs fournisseurs, dont les crédits et
          licences sont détaillés sur la page{' '}
          <Link href="/attribution" style={{ color: 'var(--accent)' }}>
            Attribution des données
          </Link>
          .
        </p>
      </LegalSection>
      <LegalSection title="Limitation de responsabilité">
        <p>
          Forkmap est fourni «&nbsp;en l’état&nbsp;» sans garantie d’aucune sorte. Nous ne sommes
          pas responsables des dommages résultant de votre utilisation de l’application, de votre
          confiance dans les données sur les restaurants, ou de toute interruption du service.
        </p>
      </LegalSection>
      <LegalSection title="Résiliation">
        <p>
          Nous nous réservons le droit de suspendre ou de résilier votre compte à tout moment en cas
          de violation des présentes conditions. Vous pouvez supprimer votre compte à tout moment
          depuis les{' '}
          <Link href="/settings" style={{ color: 'var(--accent)' }}>
            Paramètres
          </Link>
          .
        </p>
      </LegalSection>
      <LegalSection title="Modifications des présentes conditions">
        <p>
          Nous pouvons mettre à jour ces conditions de temps à autre. L’utilisation continue de
          Forkmap après des modifications vaut acceptation des nouvelles conditions.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>
          Des questions ? Utilisez la{' '}
          <Link href="/contact" style={{ color: 'var(--accent)' }}>
            page Contact
          </Link>{' '}
          ou écrivez à{' '}
          <a href="mailto:hello@forkmap.app" style={{ color: 'var(--accent)' }}>
            hello@forkmap.app
          </a>
          .
        </p>
      </LegalSection>
    </InfoPage>
  )
}
