'use client'
// Enveloppe SSR-safe de ListMiniMap. Leaflet lit `window` à l'import : le
// composant ne doit jamais entrer dans le bundle serveur. `dynamic` ne peut pas
// vivre dans CarnetScreen sans le charger côté serveur, d'où ce fichier.
import dynamic from 'next/dynamic'

export default dynamic(() => import('@/components/favorites/ListMiniMap'), { ssr: false })
