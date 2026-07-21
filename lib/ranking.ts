// ============================================================
// lib/ranking.ts — « quel est le meilleur resto ? »
//
// La différenciation de Forkmap : dire où un resto se situe parmi ses pairs.
// Calcul volontairement HONNÊTE — le rang est relatif aux restos chargés dans
// la zone visible, jamais présenté comme une autorité absolue (d'où « autour de
// toi » dans l'UI, jamais « du quartier » qu'on ne peut pas prouver).
// ============================================================
import type { PlaceCard } from '@/types'
import { frCuisine } from '@/lib/cuisine'

/** Nombre minimum de comparables (place incluse) pour qu'un rang ait du sens. */
export const RANK_MIN_COMPARABLES = 3
/** On n'affiche un rang que s'il est vendeur : dans le top N. */
export const RANK_MAX_SHOWN = 5

export interface PlaceRank {
  /** Position 1-indexée parmi les comparables (1 = le mieux noté). */
  rank: number
  /** Nombre total de comparables notés (place incluse). */
  total: number
  /** Libellé de cuisine francisé, pour l'UI (« Burger », « Japonais »…). */
  cuisineLabel: string
}

function cuisineOf(place: PlaceCard): string | null {
  const raw = place.cuisine ?? place.fsq?.categories?.[0]?.name ?? null
  return raw && raw.trim() ? raw : null
}

/**
 * Rang du resto parmi ses pairs de MÊME cuisine chargés autour de lui, classé
 * par NOTE (`fsq.rating`) — d'où le libellé UI « mieux noté ». On classe par
 * note et non par le score composite pour que la formulation soit exacte : le
 * score mêle la distance, la note non.
 *
 * Renvoie `null` (donc : ne rien afficher) quand un rang serait mensonger ou
 * sans intérêt :
 *   - le resto n'a pas de note, ou pas de cuisine identifiable ;
 *   - moins de RANK_MIN_COMPARABLES pairs notés (place incluse) ;
 *   - le resto n'est pas dans le top RANK_MAX_SHOWN.
 *
 * Départage à note égale : plus d'avis d'abord, puis ordre stable.
 */
export function placeRank(place: PlaceCard, siblings: PlaceCard[]): PlaceRank | null {
  const rating = place.fsq?.rating
  const cuisine = cuisineOf(place)
  if (rating == null || !cuisine) return null

  const label = frCuisine(cuisine).toLowerCase()

  // Comparables : même cuisine (comparaison sur le libellé francisé, robuste aux
  // variantes OSM/FSQ), notés, et la place elle-même incluse une seule fois.
  const seen = new Set<string>()
  const pool: PlaceCard[] = []
  for (const p of [place, ...siblings]) {
    if (seen.has(p.osm_id)) continue
    seen.add(p.osm_id)
    const c = cuisineOf(p)
    if (!c || frCuisine(c).toLowerCase() !== label) continue
    if (p.fsq?.rating == null) continue
    pool.push(p)
  }

  if (pool.length < RANK_MIN_COMPARABLES) return null

  pool.sort((a, b) => {
    const dr = (b.fsq!.rating ?? 0) - (a.fsq!.rating ?? 0)
    if (dr !== 0) return dr
    return (b.fsq!.total_ratings ?? 0) - (a.fsq!.total_ratings ?? 0)
  })

  const rank = pool.findIndex((p) => p.osm_id === place.osm_id) + 1
  if (rank < 1 || rank > RANK_MAX_SHOWN) return null

  return { rank, total: pool.length, cuisineLabel: frCuisine(cuisine) }
}

/** « 3ᵉ mieux noté · Burger · autour de toi ». Court, honnête sur sa base. */
export function rankLabel(r: PlaceRank): string {
  const ordinal = r.rank === 1 ? '1ᵉʳ' : `${r.rank}ᵉ`
  return `${ordinal} mieux noté · ${r.cuisineLabel} · autour de toi`
}
