// ============================================================
// scripts/lib/maps-listing.mjs — lecture d'une fiche de résultat Google Maps.
//
// Le panneau de résultats rend chaque restaurant sous forme de lignes de
// texte, sans balisage stable. Ce module transforme ces lignes en champs.
//
// En JavaScript et non en TypeScript, et testé tel quel : c'est un script qui
// s'en sert, et une deuxième implémentation recopiée en TS finirait par
// diverger de celle qui tourne vraiment.
//
// Exemple de lignes reçues :
//   ['Little Baobei', 'Little Baobei', '4,7(1 366)',
//    'Restaurant de cuisine fusion asiatique ·  · 6 Pl. Sainte-Opportune',
//    'Ferme bientôt · 14:30 · Rouvre à 19:00', 'Commander']
// ============================================================

/** « 4,7(1 366) » → note 4.7 et 1366 avis. */
export function parseRating(lines) {
  for (const l of lines) {
    // Deux formes selon ce que Google sert à la session :
    //   « 4,7 (1 366) » — panneau complet, note ET nombre d'avis
    //   « 4,7 »          — panneau réduit, note seule
    // Une session neuve reçoit souvent la seconde. Exiger les parenthèses
    // faisait perdre la note AUSSI : 0 sur 163, alors qu'elle était là.
    const m = l.match(/^(\d(?:[.,]\d)?)\s*(?:\(([^)]*)\))?\s*$/)
    if (!m) continue
    const rating = Number(m[1].replace(',', '.'))
    // Le contenu des parenthèses est dépouillé de tout ce qui n'est pas un
    // chiffre : Google sépare les milliers par une espace insécable (U+00A0),
    // qu'un jeu de caractères écrit à la main n'attrape pas.
    const digits = (m[2] ?? '').replace(/\D+/g, '')
    return { rating, reviews: digits ? Number(digits) : null }
  }
  return { rating: null, reviews: null }
}

/**
 * La note lue sur l'étiquette d'accessibilité de l'étoile.
 *
 * C'est la source FIABLE. Le texte de la carte, lui, dépend du panneau que
 * Google sert à la session : une session neuve reçoit une version réduite où
 * la note est collée au reste (« Les Deux Colombes 4,7Restaurant · … ») et où
 * le nombre d'avis n'existe pas. Mesuré : 0 note lue sur 164 restaurants en
 * passant par le texte, alors qu'elle était là.
 *
 *   « 4,6 étoiles »              → 4.6, avis inconnus
 *   « 4,7 étoiles 1 366 avis »   → 4.7 et 1366
 */
export function parseRatingLabel(label) {
  if (typeof label !== 'string') return { rating: null, reviews: null }
  const m = label.match(/^(\d(?:[.,]\d)?)\s*étoile/i)
  if (!m) return { rating: null, reviews: null }
  const rating = Number(m[1].replace(',', '.'))
  // Tout ce qui suit « étoiles » et précède « avis » est le compte, séparateurs
  // de milliers compris — espace insécable U+00A0 y compris.
  const rev = label.match(/étoiles?\s+([\d\s\u00a0\u202f.,]+?)\s*avis/i)
  const digits = rev ? rev[1].replace(/\D+/g, '') : ''
  return { rating, reviews: digits ? Number(digits) : null }
}

/**
 * « Restaurant italien · €€ · 6 Rue des Lavandières » → catégorie, prix, adresse.
 *
 * Le champ prix est souvent VIDE et laisse un séparateur orphelin
 * (« Restaurant … ·  · 6 Pl. … ») : on écarte les segments vides plutôt que de
 * prendre le deuxième segment pour un prix.
 */
export function parseCategoryLine(lines) {
  for (const l of lines) {
    if (!l.includes('·')) continue
    if (/^(Ouvert|Fermé|Ferme|Ouvre)/i.test(l)) continue
    const parts = l
      .split('·')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length < 2) continue
    const price = parts.find((p) => /^€+$/.test(p)) ?? null
    const rest = parts.filter((p) => p !== price)
    return { category: rest[0] ?? null, price, address: rest[rest.length - 1] ?? null }
  }
  return { category: null, price: null, address: null }
}

/**
 * L'état d'ouverture, et surtout l'heure qui suit.
 *
 * ⚠️ « Ferme bientôt » veut dire OUVERT. Lire l'état sur le premier mot
 * ressemblant à « Ferm… » annonce fermé un restaurant ouvert — c'est
 * exactement le bug qu'on a corrigé dans l'app.
 */
export function parseStatus(lines) {
  for (const l of lines) {
    if (!/^(Ouvert|Fermé|Ferme bientôt)/i.test(l)) continue
    const open = /^(Ouvert|Ferme bientôt)/i.test(l)
    const closesAt = l.match(/Ferme à (\d{1,2}:\d{2})/i)?.[1] ?? null
    const opensAt = l.match(/(?:Rouvre|Ouvre) à (\d{1,2}:\d{2})/i)?.[1] ?? null
    return { open, closesAt, opensAt, raw: l }
  }
  return { open: null, closesAt: null, opensAt: null, raw: null }
}

/** Assemble une fiche complète à partir du nom, du lien et des lignes. */
export function parseListing({ name, fid, lat, lon, lines, ratingLabel }) {
  // L'étiquette de l'étoile d'abord : elle survit au panneau réduit.
  const fromLabel = parseRatingLabel(ratingLabel)
  const { rating, reviews } = fromLabel.rating != null ? fromLabel : parseRating(lines)
  const { category, price, address } = parseCategoryLine(lines)
  const status = parseStatus(lines)
  return {
    fid,
    name: name?.trim() || null,
    lat,
    lon,
    rating,
    reviews,
    category,
    price,
    address,
    open_now: status.open,
    closes_at: status.closesAt,
    opens_at: status.opensAt,
  }
}
