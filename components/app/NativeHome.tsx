'use client'
// L'accueil de l'app native : le Carnet.
//
// La carte occupait `/` jusqu'ici, donc tous les liens profonds de l'app ont
// été écrits contre `/` : un resto partagé (`/?select=<osm_id>`), le rebond du
// garde d'auth (`/?auth=required`), le concierge (`/?surprise=1`), un point
// (`/?lat=&lon=`). Maintenant que `/` affiche le Carnet, ces liens doivent
// repartir vers `/carte`.
//
// `mapDeepLinkTarget` fait déjà exactement ce tri — il avait été écrit pour le
// web, où `/` est la landing. Le besoin est le même ici, on réutilise le même
// helper plutôt que d'en écrire un second qui divergerait.
//
// Le Carnet est rendu TOUT DE SUITE, la redirection se fait après.
//
// La version précédente n'affichait rien tant que le test de deep-link n'avait
// pas tourné, pour éviter un clignotement sur les liens partagés. Ça ajoutait
// une passe client avant le premier pixel de contenu à CHAQUE lancement, pour
// épargner un clignotement dans le seul cas — rare — de l'ouverture d'un lien
// partagé. Compromis inversé.
//
// (Le lancement n'a jamais montré de page blanche pour autant : `/` prérend le
// boot splash, et le Carnet est de toute façon derrière `useAuthGuard`, donc
// son contenu ne peut pas être prérendu.)
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { mapDeepLinkTarget } from '@/lib/landing'
import CarnetScreen from '@/components/favorites/CarnetScreen'

export default function NativeHome() {
  const router = useRouter()

  useEffect(() => {
    const target = mapDeepLinkTarget(window.location.search)
    if (target) router.replace(target)
  }, [router])

  return <CarnetScreen />
}
