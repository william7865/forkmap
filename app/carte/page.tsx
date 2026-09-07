// /carte — la carte, sur le web ET en natif. Elle vivait à `/` en natif
// jusqu'à ce que le Carnet devienne l'accueil de l'app ; elle a maintenant la
// même adresse partout, ce qui rend les liens partagés identiques sur les deux
// plateformes. Les liens profonds écrits contre `/` sont redirigés ici (voir
// components/app/NativeHome.tsx et components/landing/Landing.tsx).
//
// Deliberately OUTSIDE the app/(pages) group: like `/`, the map wants only the
// root layout (full-height canvas), not any nested page chrome.
import type { Metadata } from 'next'
import MapHome from '@/components/home/MapHome'

export const metadata: Metadata = {
  title: 'Carte · Forkmap',
}

export default function CartePage() {
  return <MapHome />
}
