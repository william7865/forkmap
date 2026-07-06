'use client'
import StepShell from '@/components/auth/StepShell'
import TasteChips from '@/components/auth/steps/TasteChips'
import { TASTE_OPTIONS } from '@/lib/taste-quiz'
import type { useAuthFlow } from '@/lib/hooks/useAuthFlow'

export default function TasteStep({ flow }: { flow: ReturnType<typeof useAuthFlow> }) {
  const count = flow.selectedCuisines.size
  return (
    <StepShell
      progress={flow.progress}
      onBack={flow.back}
      title="Qu'est-ce qui te fait envie ?"
      subtitle="Choisis tes cuisines préférées — on t'orientera vers les bonnes adresses. Modifiable à tout moment."
      cta={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="btn-primary" onClick={flow.submitTaste}>
            {count > 0 ? `Continuer · ${count} choisi${count > 1 ? 's' : ''}` : 'Continuer'}
          </button>
          <button
            onClick={flow.skipTaste}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-3)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Passer pour l&apos;instant
          </button>
        </div>
      }
    >
      <TasteChips
        options={TASTE_OPTIONS}
        selected={flow.selectedCuisines}
        onToggle={flow.toggleCuisine}
      />
    </StepShell>
  )
}
