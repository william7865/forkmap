// ============================================================
// lib/place-facts.ts — les trois chiffres qui décident.
//
// Une fiche de restaurant et une fiche d'import montrent le MÊME objet ; elles
// affichaient jusqu'ici deux rangées de faits écrites séparément. Cette
// fonction est la seule source, pour que les deux écrans ne puissent pas
// diverger.
//
// Règle : on ne montre QUE ce qu'on sait. Une case « — » n'informe pas, elle
// signale un trou ; sur un écran où deux cases sur trois étaient vides, la
// rangée entière perdait son sens. L'ordre est celui de l'utilité RÉELLE, pas
// de l'idéal : le nombre d'avis passe après l'horaire parce que le point
// d'entrée Google qu'on interroge ne le renvoie pas, alors qu'il donne
// toujours l'état d'ouverture.
// ============================================================

import type { PlaceCard } from '@/types'
import { closingTime, formatWalkTime } from '@/lib/format'

/** Une case : la valeur en gros, son libellé en dessous. */
export type PlaceFact = { value: string; label: string }

/** Au-delà de trois, la rangée cesse d'être lisible d'un coup d'œil. */
export const MAX_FACTS = 3

export function buildPlaceFacts(place: PlaceCard | null | undefined): PlaceFact[] {
  if (!place) return []
  const closes = closingTime(place.fsq?.hours?.today)
  const rating = place.fsq?.rating ?? place.fsq_rating

  const all: (PlaceFact | null)[] = [
    rating != null ? { value: rating.toFixed(1), label: 'NOTE' } : null,
    place.open_now != null
      ? {
          value: place.open_now ? 'Ouvert' : 'Fermé',
          // L'heure de fermeture ne veut rien dire sur un lieu FERMÉ : elle est
          // déjà passée. On ne l'affiche que quand elle renseigne encore.
          label: place.open_now && closes ? `JUSQU'À ${closes}` : 'MAINTENANT',
        }
      : null,
    place.fsq?.total_ratings != null
      ? { value: place.fsq.total_ratings.toLocaleString('fr-FR'), label: 'AVIS' }
      : null,
    place.distance != null ? { value: formatWalkTime(place.distance), label: 'À PIED' } : null,
    place.fsq?.price != null ? { value: '€'.repeat(place.fsq.price), label: 'PRIX' } : null,
    // Pas de CUISINE ici : la ligne sous le titre la porte déjà. La rangée est
    // réservée aux chiffres qui décident, pas à l'identité du lieu.
  ]

  return all.filter((f): f is PlaceFact => f !== null).slice(0, MAX_FACTS)
}
