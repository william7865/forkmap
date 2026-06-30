'use client'
import { useAuthFlow } from '@/lib/hooks/useAuthFlow'
import WelcomeStep from '@/components/auth/steps/WelcomeStep'
import EmailStep from '@/components/auth/steps/EmailStep'
import HandleStep from '@/components/auth/steps/HandleStep'

export default function AuthFlow({ onClose }: { onClose: () => void }) {
  const flow = useAuthFlow(onClose)
  switch (flow.step) {
    case 'welcome':
      return <WelcomeStep flow={flow} onClose={onClose} />
    case 'email':
      return <EmailStep flow={flow} />
    case 'handle':
      return <HandleStep flow={flow} />
    default:
      // Étapes ajoutées dans les tasks suivantes.
      return <WelcomeStep flow={flow} onClose={onClose} />
  }
}
