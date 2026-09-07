import Image from 'next/image'

// Découpe une RÉGION d'une capture d'app et la présente comme un artefact plat,
// sans coque de téléphone.
//
// Pourquoi : mettre un téléphone dans chaque section faisait que toutes les
// sections se ressemblaient, quelle que soit leur composition. Il n'y a donc
// plus qu'un seul appareil sur la page (le hero) ; les sections montrent la
// CHOSE dont elles parlent — une vidéo reconnue, une adresse proposée, une
// collection — recadrée directement dans les captures réelles. Aucune image
// inventée : ce que le visiteur voit est exactement ce que l'app affiche.
//
// Les coordonnées sont exprimées dans le repère de la capture source
// (804×1748). Elles ne servent que de RATIOS : la résolution réelle du fichier
// n'entre nulle part dans le calcul.
//
// ⚠️ PLAFOND DE NETTETÉ — c'est la contrainte qui décide de la taille
// d'affichage, pas le goût. Les captures actuelles font 804px de large, soit
// ~208px par vignette du rail des favoris. Sur un écran Retina (dpr 2), une
// vignette montrée à 160px CSS demande 320px réels : elle est déjà agrandie
// ×1,5. Aucun réglage de code ne récupère du détail qui n'est pas dans le
// fichier.
//
// POUR Y REMÉDIER : refaire les 4 captures de public/landing en @3x
// (~1206×2622) depuis le simulateur. Comme tout ici est proportionnel, il
// suffit de remplacer les fichiers — aucune coordonnée à re-mesurer, tant que
// la mise en page des écrans ne change pas. Seul SHOT_W/SHOT_H est à ajuster
// si le RATIO de l'appareil change (804/1748 = 0,460).

const SHOT_W = 804
const SHOT_H = 1748

export default function Shot({
  src,
  alt,
  x,
  y,
  w,
  h,
  radius = 14,
  sizes = '(max-width: 980px) 90vw, 460px',
  style,
  className,
}: {
  src: string
  alt: string
  /** Région à garder, en pixels de la capture source. */
  x: number
  y: number
  w: number
  h: number
  radius?: number
  sizes?: string
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${w} / ${h}`,
        overflow: 'hidden',
        borderRadius: radius,
        // Même parade WebKit que PhoneFrame : un ancêtre animé en transform
        // empêche le clip d'un coin arrondi sans couche de composition propre.
        isolation: 'isolate',
        transform: 'translateZ(0)',
        ...style,
      }}
    >
      {/* Boîte à l'échelle de la capture entière, décalée pour amener la
         région voulue dans le cadre ci-dessus. */}
      <div
        style={{
          position: 'absolute',
          width: `${(SHOT_W / w) * 100}%`,
          left: `${(-x / w) * 100}%`,
          top: `${(-y / h) * 100}%`,
          aspectRatio: `${SHOT_W} / ${SHOT_H}`,
        }}
      >
        {/* `eager` et pas le lazy par défaut : ces quatre images SONT le
           contenu de la page, et le lazy les laissait vides pour tout rendu
           qui ne scrolle pas (capture, aperçu de lien) — vérifié, elles
           arrivaient à naturalWidth 0. Next les sert redimensionnées, donc le
           coût réel est bien inférieur au poids des PNG source. */}
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          loading="eager"
          style={{ objectFit: 'cover' }}
        />
      </div>
    </div>
  )
}
