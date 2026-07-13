import { describe, it, expect } from 'vitest'
import { extractPlaceCandidates } from '@/lib/import/candidates'
import type { ImportCandidate } from '@/lib/import/parse'

function post(partial: Partial<ImportCandidate>): ImportCandidate {
  return {
    platform: 'tiktok',
    handle: null,
    title: '',
    description: '',
    hashtags: [],
    query: '',
    ...partial,
  }
}

const names = (out: { name: string }[]) => out.map((c) => c.name)

describe('extractPlaceCandidates', () => {
  it('lit le marqueur 📍 en priorité absolue', () => {
    const out = extractPlaceCandidates(
      post({
        description: 'Un incroyable restaurant caché dans une gare 😍 📍 Le Train Bleu, Paris 12e',
      })
    )
    expect(out[0].name).toBe('Le Train Bleu')
    expect(out[0].city).toBe('Paris 12e')
    expect(out[0].confidence).toBeGreaterThanOrEqual(0.9)
  })

  it('accepte les autres marqueurs de lieu (📌, 🏠)', () => {
    const out = extractPlaceCandidates(post({ description: '📌 Kodawari Ramen, Paris' }))
    expect(out[0].name).toBe('Kodawari Ramen')
    const home = extractPlaceCandidates(post({ description: '🏠 Kodawari Ramen, Paris' }))
    expect(home[0].name).toBe('Kodawari Ramen')
  })

  // Le cas qu'Albo rate : le nom est dans une phrase, sans marqueur.
  it('trouve un nom propre capitalisé dans une phrase narrative', () => {
    const out = extractPlaceCandidates(
      post({ description: "J'ai testé Le Train Bleu et c'était incroyable" })
    )
    expect(names(out)).toContain('Le Train Bleu')
  })

  it('propose le handle du compte, humanisé, quand il ressemble à un resto', () => {
    const out = extractPlaceCandidates(
      post({ handle: 'kodawari.ramen', description: 'le meilleur ramen' })
    )
    expect(names(out)).toContain('kodawari ramen')
  })

  it('écarte les hashtags génériques', () => {
    const out = extractPlaceCandidates(
      post({
        description: 'trop bon #paris #restaurant #food #foodporn',
        hashtags: ['paris', 'restaurant', 'food', 'foodporn'],
      })
    )
    expect(names(out)).not.toContain('paris')
    expect(names(out)).not.toContain('food')
  })

  it('renvoie une liste vide quand il n’y a rien à deviner', () => {
    expect(extractPlaceCandidates(post({ description: 'trop bon 😍😍' }))).toEqual([])
  })

  it('ne renvoie jamais de doublon et trie par confiance décroissante', () => {
    const out = extractPlaceCandidates(
      post({
        handle: 'le.train.bleu',
        description: '📍 Le Train Bleu, Paris — Le Train Bleu est magnifique',
      })
    )
    const keys = out.map((c) => c.name.toLowerCase())
    expect(new Set(keys).size).toBe(keys.length)
    for (let i = 1; i < out.length; i++) {
      expect(out[i - 1].confidence).toBeGreaterThanOrEqual(out[i].confidence)
    }
  })

  // ----------------------------------------------------------------
  // Non-régression : les 10 défauts remontés par la revue adversariale.
  // ----------------------------------------------------------------
  describe('non-régression', () => {
    it('1. 🍴/🍽 sont décoratifs, pas des marqueurs de lieu', () => {
      const fork = extractPlaceCandidates(post({ description: "on a bien mangé 🍴 c'était fou" }))
      expect(fork).toEqual([])

      const plate = extractPlaceCandidates(
        post({ description: 'Meilleur brunch de Paris 🍽 vraiment un pur bonheur ce matin' })
      )
      expect(names(plate)).not.toContain('vraiment un pur bonheur ce matin')
      expect(plate).toEqual([])
    })

    it('2. après un pin, ne garde que la tête nominale du nom', () => {
      const out = extractPlaceCandidates(
        post({ description: '📍 Septime rooftop incroyable la vue est dingue' })
      )
      expect(out[0]).toEqual({ name: 'Septime', city: null, confidence: 0.95 })
    })

    it('3. les stopwords écartent vraiment les faux runs capitalisés', () => {
      const reco = extractPlaceCandidates(post({ description: 'Je Recommande ce super spot' }))
      expect(names(reco)).not.toContain('Je Recommande')
      expect(reco).toEqual([])

      const ami = extractPlaceCandidates(post({ description: 'Avec Thomas on a testé ce resto' }))
      expect(names(ami)).not.toContain('Avec Thomas')
      expect(names(ami)).not.toContain('Thomas')
      expect(ami).toEqual([])
    })

    it('3bis. « Le / La / Les » restent des débuts de nom valides', () => {
      const out = extractPlaceCandidates(post({ description: "Le Train Bleu, c'est magique" }))
      expect(names(out)).toContain('Le Train Bleu')
    })

    it('4. un nom capitalisé de la légende passe devant le handle du créateur', () => {
      const out = extractPlaceCandidates(
        post({ handle: 'julien.dupont', description: "J'ai adoré Le Petit Cambodge hier soir" })
      )
      expect(out[0].name).toBe('Le Petit Cambodge')
      expect(out[0].confidence).toBe(0.65)
      expect(out[1].name).toBe('julien dupont')
      expect(out[1].confidence).toBe(0.6)
    })

    it('5. capture les noms de resto en un seul mot', () => {
      const septime = extractPlaceCandidates(post({ description: "J'ai adoré Septime hier soir" }))
      expect(names(septime)).toContain('Septime')
      expect(septime.find((c) => c.name === 'Septime')?.confidence).toBe(0.35)

      const bacchus = extractPlaceCandidates(post({ description: 'on est allé chez Bacchus' }))
      expect(names(bacchus)).toContain('Bacchus')
    })

    it('6. le marqueur textuel « chez » est reconnu', () => {
      const out = extractPlaceCandidates(post({ description: 'on est allé chez Bacchus' }))
      expect(out[0]).toEqual({ name: 'Bacchus', city: null, confidence: 0.8 })
    })

    it('7. le filtre générique s’applique aussi au pin et aux runs', () => {
      expect(extractPlaceCandidates(post({ description: '📍 Paris' }))).toEqual([])

      const tiktok = extractPlaceCandidates(
        post({ description: 'Vu sur TikTok France cette pépite' })
      )
      expect(names(tiktok)).not.toContain('TikTok France')
      expect(tiktok).toEqual([])

      // Un nom qui *contient* un mot générique survit.
      const bistrot = extractPlaceCandidates(post({ description: '📍 Bistrot Paris 12, Paris' }))
      expect(bistrot[0].name).toBe('Bistrot Paris 12')
      expect(bistrot[0].city).toBe('Paris')
    })

    it('8. plusieurs pins : chaque lieu donne son candidat', () => {
      const out = extractPlaceCandidates(
        post({ description: '📍 Le Train Bleu, Paris puis 📍 Septime, Paris' })
      )
      expect(out[0]).toEqual({ name: 'Le Train Bleu', city: 'Paris', confidence: 0.95 })
      expect(out.find((c) => c.name === 'Septime')).toEqual({
        name: 'Septime',
        city: 'Paris',
        confidence: 0.95,
      })
    })

    it('9. nettoie les emojis à l’intérieur du nom', () => {
      const out = extractPlaceCandidates(post({ description: '📍 Chez 🔥 Marcel, Paris' }))
      expect(out[0].name).toBe('Chez Marcel')
      expect(out[0].city).toBe('Paris')
    })

    it('10. une adresse complète ne devient pas la ville', () => {
      const out = extractPlaceCandidates(
        post({ description: '📍 Chez Marcel, 12 rue de la Paix, Paris, France' })
      )
      expect(out[0].name).toBe('Chez Marcel')
      expect(out[0].city).toBe('Paris')
    })
  })
})
