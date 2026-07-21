// components/native/BootSplash.tsx
// ────────────────────────────────────────────────────────────
// Prolonge l'écran de lancement natif, sans le dédoubler.
//
// iOS retire son écran de lancement dès que la fenêtre est prête — soit ~200 ms
// avec un bundle embarqué : le logo passait trop vite pour être vu. Le plugin
// Capacitor pouvait le retenir, mais il le faisait en ré-instanciant le même
// storyboard PAR-DESSUS, donc le logo apparaissait deux fois.
//
// Ce calque-ci est du web, peint dès la première frame (markup statique, pas de
// React, pas d'hydratation à attendre), et il redessine EXACTEMENT la même
// marque, à la même taille et au même endroit que l'image native :
//
//   scaleAspectFill sur un écran portrait ⇒ l'image carrée est mise à l'échelle
//   par la HAUTEUR. La marque fait 20 % du côté du carré (generate-app-assets.mjs)
//   ⇒ 20vh à l'écran, et son sommet tombe à 38,5vh (centre optique, -1,5 %).
//
// Résultat : la reprise entre le natif et le web est invisible. Un seul logo,
// affiché une seule fois, dont on maîtrise la durée.
// ────────────────────────────────────────────────────────────

/** Durée d'affichage pleine, puis fondu.
 *  Court : le logo est déjà visible depuis l'écran natif et le pont du plugin
 *  (cf. capacitor.config.ts), donc ce délai s'AJOUTE à ce qui précède. */
const HOLD_MS = 600
const FADE_MS = 300

export default function BootSplash() {
  return (
    <>
      <div id="boot-splash" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none">
          <g fill="none" stroke="#f5a623" strokeWidth={4.4} strokeLinecap="round">
            <path d="M24 9c-3.4 3.8 3.4 6 0 9.8" />
            <path d="M32 6c-3.4 3.8 3.4 6 0 9.8" />
            <path d="M40 9c-3.4 3.8 3.4 6 0 9.8" />
          </g>
          <rect x="11" y="27.5" width="42" height="5.4" rx="2.7" fill="#f2f2f3" />
          <path d="M15 34h34a17 17 0 0 1-34 0Z" fill="#f2f2f3" />
        </svg>
      </div>
      <style>{`
        #boot-splash {
          position: fixed;
          inset: 0;
          /* Au-dessus de TOUT, y compris les overlays plein écran (max 100002
             dans le projet) : rien ne doit passer devant l'écran de démarrage. */
          z-index: 2147483000;
          background: #0f0f10;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          /* Le fill-mode forwards est REQUIS ici, contrairement aux animations
             d'entree : l'etat final (invisible) doit persister, sinon le splash
             revient a la fin du fondu. Voir tests/animation-fill-mode.test.ts. */
          animation: bootSplashOut ${FADE_MS}ms cubic-bezier(0.16, 1, 0.3, 1) ${HOLD_MS}ms forwards;
        }
        #boot-splash svg {
          width: 20vh;
          height: 20vh;
          /* Centré à 40vh par le flex ; l'image native pose la marque à 38,5vh. */
          transform: translateY(-1.5vh);
        }
        @keyframes bootSplashOut {
          to {
            opacity: 0;
            visibility: hidden;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          #boot-splash {
            animation-duration: 1ms;
          }
        }
      `}</style>
    </>
  )
}
