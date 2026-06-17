// Camaïeux chauds terracotta → encre uniquement (accent unique, pas de bariolage)
export const PLACE_GRADIENTS: [string, string][] = [
  ['#bb5e2e', '#5c2c14'], // terracotta → brun profond
  ['#a8521f', '#2a1c12'], // clay → encre
  ['#8c4a2a', '#3f2316'], // terre cuite sombre
  ['#9f4d22', '#241f18'], // terre brûlée → encre
  ['#8a7253', '#3f372c'], // taupe chaud → encre
  ['#6b5d4a', '#2c241b'], // pierre chaude → encre
]

export function placeGradient(id: string): string {
  const idx = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % PLACE_GRADIENTS.length
  const [from, to] = PLACE_GRADIENTS[idx]
  return `linear-gradient(135deg, ${from}, ${to})`
}

export function listGradient(id: string): [string, string] {
  const idx = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % PLACE_GRADIENTS.length
  return PLACE_GRADIENTS[idx]
}
