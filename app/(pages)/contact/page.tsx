import type { Metadata } from 'next'
import ContactContent from './ContactContent'

export const metadata: Metadata = {
  title: 'Contact · Forkmap',
  description: 'Une question, une erreur de données ou une suggestion ? Écrivez-nous.',
}

export default function ContactPage() {
  return <ContactContent />
}
