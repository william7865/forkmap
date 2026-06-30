'use client'
import { useAuthFlow } from '@/lib/hooks/useAuthFlow'
import WelcomeStep from '@/components/auth/steps/WelcomeStep'
import EmailStep from '@/components/auth/steps/EmailStep'
import HandleStep from '@/components/auth/steps/HandleStep'
import AvatarStep from '@/components/auth/steps/AvatarStep'
import DoneStep from '@/components/auth/steps/DoneStep'

export default function AuthFlow({ onClose }: { onClose: () => void }) {
  const flow = useAuthFlow(onClose)
  switch (flow.step) {
    case 'welcome':
      return <WelcomeStep flow={flow} onClose={onClose} />
    case 'email':
      return <EmailStep flow={flow} />
    case 'handle':
      return <HandleStep flow={flow} />
    case 'avatar':
      return <AvatarStep flow={flow} />
    case 'done':
      return <DoneStep flow={flow} onClose={onClose} />
    default:
      return <WelcomeStep flow={flow} onClose={onClose} />
  }
}
