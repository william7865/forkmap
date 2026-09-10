import { describe, it, expect, vi } from 'vitest'
import type { ImportRow } from '@/types'

vi.mock('@/lib/import/resolve', () => ({ resolveImport: vi.fn() }))
vi.mock('@/lib/native/platform', () => ({ isNativeRuntime: () => false }))

import { withTimeout } from '@/lib/hooks/useImports'

const resolved: Partial<ImportRow> = { status: 'resolved', osm_id: 'node/1' }

describe('withTimeout', () => {
  it('laisse passer un résultat arrivé à temps', async () => {
    await expect(withTimeout(Promise.resolve(resolved), 1000)).resolves.toEqual(resolved)
  })

  // Le cas qui a coûté deux jours d'attente : la boucle de résolution est
  // séquentielle et verrouillée, donc UNE résolution suspendue fige tous les
  // imports suivants et la tuile tourne indéfiniment.
  it('rend un échec quand rien n’arrive', async () => {
    const jamais = new Promise<Partial<ImportRow>>(() => {})
    const out = await withTimeout(jamais, 20)
    expect(out.status).toBe('failed')
    expect(out.resolved_at).toBeTruthy()
  })

  // Un verdict d'échec doit être complet : sans ces champs, la ligne garderait
  // un lieu ou des candidats d'une tentative précédente.
  it('nettoie la ligne au passage', async () => {
    const out = await withTimeout(new Promise<Partial<ImportRow>>(() => {}), 20)
    expect(out.osm_id).toBeNull()
    expect(out.place_snapshot).toBeNull()
    expect(out.candidates).toBeNull()
  })

  it('n’attend pas le plafond quand la réponse est immédiate', async () => {
    const t = Date.now()
    await withTimeout(Promise.resolve(resolved), 5000)
    expect(Date.now() - t).toBeLessThan(500)
  })
})
