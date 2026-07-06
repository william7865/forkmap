'use client'
import { useState } from 'react'
import StepShell from '@/components/auth/StepShell'
import TasteChips from '@/components/auth/steps/TasteChips'
import { TASTE_OPTIONS, TASTE_OPTION_KEYS } from '@/lib/taste-quiz'
import {
  loadTasteProfile,
  saveTasteProfile,
  setDeclaredCuisines,
  TASTE_SEED_VALUE,
} from '@/lib/taste'

/**
 * Re-editable taste picker opened from settings. Pre-selects cuisines whose
 * learned affinity already reaches the declared-love threshold, and reconciles
 * additions/removals via setDeclaredCuisines on save.
 */
export default function TasteEditor({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(() => {
    const profile = loadTasteProfile()
    return new Set(TASTE_OPTION_KEYS.filter((k) => (profile.cuisines[k] ?? 0) >= TASTE_SEED_VALUE))
  })

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const save = () => {
    saveTasteProfile(setDeclaredCuisines(loadTasteProfile(), TASTE_OPTION_KEYS, [...selected]))
    onClose()
  }

  const count = selected.size
  return (
    <StepShell
      onClose={onClose}
      title="Tes goûts"
      subtitle="Sélectionne les cuisines que tu préfères. On s'en sert pour mettre en avant les adresses faites pour toi."
      cta={
        <button className="btn-primary" onClick={save}>
          {count > 0 ? `Enregistrer · ${count}` : 'Enregistrer'}
        </button>
      }
    >
      <TasteChips options={TASTE_OPTIONS} selected={selected} onToggle={toggle} />
    </StepShell>
  )
}
