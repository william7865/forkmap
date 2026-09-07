// /favorites — le Carnet sur le web, et la cible des liens existants.
//
// L'écran lui-même vit dans components/favorites/CarnetScreen.tsx : en natif
// il est aussi rendu par `/` (voir app/page.tsx), puisque le Carnet est l'écran
// d'accueil de l'app. Une seule implémentation, deux routes.
import CarnetScreen from '@/components/favorites/CarnetScreen'

export default function FavoritesPage() {
  return <CarnetScreen />
}
