// Dégradés de couverture (cartes de lieu, couvertures de listes).
// Web : camaïeux chauds terracotta → encre (identité papier, inchangée).
// App native : camaïeux gris neutres → noir ("Monochrome Premium").
import { isNativeRuntime } from '@/lib/native/platform'

const WEB_GRADIENTS: [string, string][] = [
  ['#bb5e2e', '#5c2c14'], // terracotta → brun profond
  ['#a8521f', '#2a1c12'], // clay → encre
  ['#8c4a2a', '#3f2316'], // terre cuite sombre
  ['#9f4d22', '#241f18'], // terre brûlée → encre
  ['#8a7253', '#3f372c'], // taupe chaud → encre
  ['#6b5d4a', '#2c241b'], // pierre chaude → encre
]

const NATIVE_GRADIENTS: [string, string][] = [
  ['#52525b', '#18181b'], // zinc → presque noir
  ['#3f3f46', '#0a0a0a'], // graphite → noir
  ['#71717a', '#27272a'], // gris moyen → encre
  ['#5f5f68', '#1c1c1f'], // ardoise → nuit
  ['#6b6b76', '#232326'], // gris chaud neutre → encre
  ['#484850', '#111112'], // anthracite → noir
]

function ramp(): [string, string][] {
  return isNativeRuntime() ? NATIVE_GRADIENTS : WEB_GRADIENTS
}

// Rétrocompat : certains imports référencent encore PLACE_GRADIENTS.
export const PLACE_GRADIENTS = WEB_GRADIENTS

export function placeGradient(id: string): string {
  const g = ramp()
  const idx = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % g.length
  const [from, to] = g[idx]
  return `linear-gradient(135deg, ${from}, ${to})`
}

export function listGradient(id: string): [string, string] {
  const g = ramp()
  const idx = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % g.length
  return g[idx]
}
