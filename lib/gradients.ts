export const PLACE_GRADIENTS: [string, string][] = [
  ['#1c3a28', '#4a8c5c'], // forest green
  ['#3a1c1c', '#8c4a4a'], // terracotta red
  ['#1c2a3a', '#4a5c8c'], // navy blue
  ['#3a2d1c', '#8c6c3a'], // warm amber
  ['#2d1c3a', '#6c4a8c'], // purple
  ['#1c3a3a', '#3a8c8c'], // teal
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
