/**
 * La carte, en version pleine lisible.
 *
 * ⚠️ Remplir l'icône `Map` de lucide la rend ILLISIBLE : son contour et ses
 * deux traits de pliure sont peints de la même couleur, donc les pliures
 * disparaissent dans le remplissage et il ne reste qu'un pentagone noir. On
 * redessine les pliures dans la couleur du fond, où elles se lisent comme des
 * découpes — le rendu d'une icône de carte pleine sur iOS.
 *
 * Partagé par les trois chrome de navigation (app, barre web, rail desktop) :
 * une deuxième copie finirait par diverger.
 */
export default function MapGlyph({ active, size = 25 }: { active: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 1.4 : 1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 6l7-3 8 3 7-3v15l-7 3-8-3-7 3z" fill={active ? 'currentColor' : 'none'} />
      <path d="M8 3v15M16 6v15" stroke={active ? 'var(--bg)' : 'currentColor'} />
    </svg>
  )
}
