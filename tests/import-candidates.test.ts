import { describe, it, expect } from 'vitest'
import { extractPlaceCandidates } from '@/lib/import/candidates'
import type { ImportCandidate } from '@/lib/import/parse'

function post(partial: Partial<ImportCandidate>): ImportCandidate {
  return {
    platform: 'tiktok',
    handle: null,
    account: null,
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

  // Le cas difficile : le nom est dans une phrase, sans marqueur explicite.
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

  // ----------------------------------------------------------------
  // Nom de compte + nettoyage des suffixes d'enseigne (cas SUSHIWAN).
  // ----------------------------------------------------------------
  describe('nom de compte & suffixes d’enseigne', () => {
    it('propose le nom du compte comme candidat à haute confiance', () => {
      const out = extractPlaceCandidates(
        post({
          account: 'SUSHIWAN',
          handle: 'sushiwanfrance',
          description: 'IDENTIFIE LA PERSONNE QUI TE DOIT DES SUSHIS 📍 13 restaurants en IDF',
        })
      )
      const sushiwan = out.find((c) => c.name.toLowerCase() === 'sushiwan')
      expect(sushiwan).toBeDefined()
      expect(sushiwan?.confidence).toBe(0.8)
    })

    it('nettoie le suffixe pays collé au handle (sushiwanfrance → sushiwan)', () => {
      const out = extractPlaceCandidates(post({ handle: 'sushiwanfrance' }))
      expect(names(out).map((n) => n.toLowerCase())).toContain('sushiwan')
      expect(names(out).map((n) => n.toLowerCase())).not.toContain('sushiwanfrance')
    })

    it('utilise une @mention de la légende comme candidat (le compte du resto)', () => {
      const out = extractPlaceCandidates(post({ mentions: ['bouillon.pigalle'] }))
      const g = out.find((c) => c.name.toLowerCase() === 'bouillon pigalle')
      expect(g).toBeTruthy()
      expect(g!.confidence).toBe(0.6)
    })

    it('nettoie les suffixes séparés (officiel, .fr, _off, paris)', () => {
      expect(names(extractPlaceCandidates(post({ handle: 'bistrot.officiel' })))[0]).toBe('bistrot')
      expect(names(extractPlaceCandidates(post({ handle: 'lami_off' })))[0]).toBe('lami')
      expect(names(extractPlaceCandidates(post({ account: 'Frenchie France' })))[0]).toBe(
        'Frenchie'
      )
      expect(names(extractPlaceCandidates(post({ account: 'Clover Paris' })))[0]).toBe('Clover')
    })

    it('cas réel Onyx : compte guide ignoré, adresse exploitée, verbe CTA retiré', () => {
      // Reel Instagram posté par « 🍴 Guide Restoaparis » (un guide, pas le resto).
      const out = extractPlaceCandidates(
        post({
          account: '🍴 Guide Restoaparis depuis 1999',
          description:
            'La grande cuisine française dans un cadre chic. Découvrez Onyx, 71 rue de Provence, Paris. Réservez votre table.',
        })
      )
      // Le resto (Onyx, via l'adresse) est le meilleur candidat, avec sa ville.
      expect(out[0].name).toBe('Onyx')
      expect(out[0].city).toBe('Paris')
      expect(out[0].confidence).toBeGreaterThanOrEqual(0.9)
      // Le compte guide n'est jamais proposé, ni « Découvrez Onyx ».
      const lowered = names(out).map((n) => n.toLowerCase())
      expect(lowered.some((n) => n.includes('guide') || n.includes('restoaparis'))).toBe(false)
      expect(lowered).not.toContain('découvrez onyx')
    })

    it('retire le verbe d’appel à l’action d’un run (Découvrez Onyx → Onyx)', () => {
      const out = extractPlaceCandidates(post({ description: 'Découvrez Onyx, une pépite' }))
      expect(names(out)).toContain('Onyx')
      expect(names(out)).not.toContain('Découvrez Onyx')
    })

    it('ignore un compte/handle de curateur (guide, foodie, best…)', () => {
      expect(names(extractPlaceCandidates(post({ account: 'Paris Foodie' })))).toHaveLength(0)
      expect(names(extractPlaceCandidates(post({ handle: 'best_restos' })))).toHaveLength(0)
      expect(names(extractPlaceCandidates(post({ handle: 'paris.foodguide' })))).toHaveLength(0)
    })

    it('extrait « Nom, adresse, ville » sans marqueur 📍', () => {
      const out = extractPlaceCandidates(
        post({ description: 'Septime, 80 rue de Charonne, Paris' })
      )
      expect(out[0].name).toBe('Septime')
      expect(out[0].city).toBe('Paris')
      expect(out[0].confidence).toBeGreaterThanOrEqual(0.9)
    })

    it('un pin de la légende passe toujours devant le nom de compte', () => {
      const out = extractPlaceCandidates(
        post({ account: 'SUSHIWAN', description: '📍 Le Train Bleu, Paris' })
      )
      expect(out[0].name).toBe('Le Train Bleu')
      expect(out[0].confidence).toBe(0.95)
    })

    it('dédoublonne compte et handle vers un seul candidat (garde la haute confiance)', () => {
      const out = extractPlaceCandidates(post({ account: 'SUSHIWAN', handle: 'sushiwanfrance' }))
      const keys = out.map((c) => c.name.toLowerCase())
      expect(keys.filter((k) => k === 'sushiwan').length).toBe(1)
      expect(out.find((c) => c.name.toLowerCase() === 'sushiwan')?.confidence).toBe(0.8)
    })

    it('n’émet pas de candidat compte quand il est générique', () => {
      const out = extractPlaceCandidates(post({ account: 'Paris', handle: 'restaurant' }))
      expect(out).toEqual([])
    })

    it('un pin leurre « 📍 13 restaurants » ne bat pas le nom du compte (cas SUSHIWAN)', () => {
      const out = extractPlaceCandidates(
        post({
          account: 'SUSHIWAN',
          handle: 'sushiwanfrance',
          description: 'IDENTIFIE LA PERSONNE QUI TE DOIT DES SUSHIS 📍 13 restaurants en IDF',
          hashtags: ['paris', 'halal', 'restaurant', 'sushi'],
        })
      )
      expect(out[0].name.toLowerCase()).toBe('sushiwan')
      expect(out[0].confidence).toBe(0.8)
      expect(names(out).map((n) => n.toLowerCase())).not.toContain('13 restaurants en idf')
    })

    it('un vrai nom d’enseigne à chiffre initial survit (3 Brasseurs)', () => {
      const out = extractPlaceCandidates(post({ description: '📍 3 Brasseurs, Lille' }))
      expect(out[0].name).toBe('3 Brasseurs')
    })
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

  // ----------------------------------------------------------------
  // Non-régression, 2e passe : les 7 défauts de la revue adversariale.
  // ----------------------------------------------------------------
  describe('non-régression (2e passe)', () => {
    it('1. une légende tout en MAJUSCULES ne devient pas un candidat', () => {
      const out = extractPlaceCandidates(
        post({ description: "J'ADORE SEPTIME CE RESTAURANT EST INCROYABLE VRAIMENT" })
      )
      expect(names(out)).not.toContain("J'ADORE SEPTIME CE RESTAURANT EST INCROYABLE VRAIMENT")
      expect(out).toEqual([])
    })

    it('1bis. en MAJUSCULES, « chez » ne mange pas la phrase entière', () => {
      const out = extractPlaceCandidates(
        post({ description: 'ON EST ALLE CHEZ BACCHUS HIER SOIR TROP BON' })
      )
      expect(names(out)).not.toContain('CHEZ BACCHUS HIER SOIR TROP BON')
      expect(out[0]).toEqual({ name: 'BACCHUS', city: null, confidence: 0.8 })
    })

    it('2. « chez » en minuscules capture bien le nom qui suit', () => {
      const out = extractPlaceCandidates(
        post({ description: 'on est allé chez bacchus hier soir' })
      )
      expect(out[0]).toEqual({ name: 'bacchus', city: null, confidence: 0.8 })
    })

    it('2bis. « chez moi / nous / elle » ne sont pas des lieux', () => {
      for (const description of [
        'on a mangé chez moi ce soir',
        'on dîne chez nous ce soir',
        'je cuisine chez elle ce soir',
      ]) {
        expect(extractPlaceCandidates(post({ description }))).toEqual([])
      }
    })

    it('3. « et » sépare deux lieux au lieu de les fusionner', () => {
      const out = extractPlaceCandidates(post({ description: 'Septime et Clover' }))
      expect(names(out)).not.toContain('Septime et Clover')
      expect(names(out)).toContain('Septime')
      expect(names(out)).toContain('Clover')
    })

    it('3bis. « à » ne prolonge pas un run capitalisé', () => {
      const out = extractPlaceCandidates(post({ description: 'Mon Nouveau Spot Préféré à Paris' }))
      expect(names(out)).not.toContain('Nouveau Spot Préféré à Paris')
      expect(out).toEqual([])
    })

    it('4. « Best » / « My » peuvent commencer un nom d’enseigne', () => {
      const bagel = extractPlaceCandidates(
        post({ description: 'Best Bagel, mon spot du dimanche' })
      )
      expect(bagel[0].name).toBe('Best Bagel')

      const kitchen = extractPlaceCandidates(post({ description: 'My Little Kitchen, une pépite' }))
      expect(kitchen[0].name).toBe('My Little Kitchen')
    })

    it('4bis. « Notre … » ne bat pas le handle du resto', () => {
      const out = extractPlaceCandidates(
        post({ handle: 'bouillon.pigalle', description: 'Notre Nouvelle Adresse Préférée est ici' })
      )
      expect(names(out)).not.toContain('Notre Nouvelle Adresse Préférée')
      expect(names(out)).not.toContain('Nouvelle Adresse Préférée')
      expect(out[0].name).toBe('bouillon pigalle')
    })

    it('5. la ville collée à un code postal est récupérée', () => {
      const out = extractPlaceCandidates(
        post({ description: '📍 Chez Fifi, 10 rue de Charonne, 75011 Paris' })
      )
      expect(out[0]).toEqual({ name: 'Chez Fifi', city: 'Paris', confidence: 0.95 })
    })

    it('6. après un pin, la ville collée au nom est détachée', () => {
      const out = extractPlaceCandidates(post({ description: '📍 Septime 🔥🔥🔥 Paris' }))
      expect(out[0]).toEqual({ name: 'Septime', city: 'Paris', confidence: 0.95 })
    })

    it('7. un chiffre final reste dans un nom narratif', () => {
      const out = extractPlaceCandidates(
        post({ description: "j'ai adoré le Bouillon 47, une tuerie" })
      )
      expect(names(out)).toContain('Bouillon 47')
    })
  })
})
