'use client'
import { useAuthFlow } from '@/lib/hooks/useAuthFlow'
import WelcomeStep from '@/components/auth/steps/WelcomeStep'

export default function AuthFlow({ onClose }: { onClose: () => void }) {
  const flow = useAuthFlow(onClose)
  switch (flow.step) {
    case 'welcome':
      return <WelcomeStep flow={flow} onClose={onClose} />
    default:
      // Étapes ajoutées dans les tasks suivantes.
      return <WelcomeStep flow={flow} onClose={onClose} />
  }
}
