// Root route — one entry, two faces.
//
// Native (Capacitor static export, NEXT_EXPORT=true) : l'app ouvre sur le
// CARNET. C'est ce que Forkmap promet — les restos repérés en vidéo, rangés —
// et c'est le seul écran qui a du contenu produit par l'utilisateur seul. La
// carte a sa propre route, `/carte`, partout.
// Web (Vercel) : les visiteurs arrivent sur la page marketing ; la carte vit
// aussi sur `/carte`.
//
// This is a server component so it can read NEXT_EXPORT (a build-time, non-public
// env var invisible to client bundles) and pick the branch at build time.
import NativeHome from '@/components/app/NativeHome'
import Landing from '@/components/landing/Landing'

const isExport = process.env.NEXT_EXPORT === 'true'

export default function Page() {
  return isExport ? <NativeHome /> : <Landing />
}
