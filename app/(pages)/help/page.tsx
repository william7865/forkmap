import type { Metadata } from 'next'
import HelpContent from './HelpContent'

export const metadata: Metadata = {
  title: 'Aide & FAQ · Forkmap',
  description: 'Questions fréquentes sur l’utilisation de Forkmap.',
}

export default function HelpPage() {
  return <HelpContent />
}
