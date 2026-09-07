import Image from 'next/image'
import PhoneFrame from '../PhoneFrame'
import { Reveal } from '../useReveal'

// Ton carnet — la section de la PLURALITÉ (des listes, des amis, des visites).
//
// Contraste avec L'import : là-bas une séquence numérotée reliée par un filet,
// ici trois usages parallèles, sans ordre, séparés par des filets horizontaux.
// L'appareil passe à droite (il était à gauche dans L'import) et la colonne de
// texte le remplit sur toute sa hauteur — une colonne courte à côté d'un
// téléphone de 657px laissait 456px de vide mesurés au-dessus du titre.

const USES = [
  {
    title: 'Des listes',
    body: 'Pour les brunchs, pour Lisbonne, pour les soirs de flemme. Seul ou à plusieurs.',
  },
  {
    title: 'Des amis',
    body: 'Suis les gens dont tu aimes le goût, et vois où ils ont vraiment mangé.',
  },
  {
    title: 'Des souvenirs',
    body: 'Consigne la visite : la note, l’addition, ce que tu avais pris.',
  },
]

export default function NotebookSection() {
  return (
    <section
      id="carnet"
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}
    >
      <div
        className="lp-wrap lp-carnet"
        style={{
          paddingTop: 'clamp(72px, 9vw, 116px)',
          paddingBottom: 'clamp(72px, 9vw, 116px)',
        }}
      >
        <div className="lp-carnet-copy">
          <Reveal y={18}>
            <h2 className="lp-h2">
              Tout ce que tu as aimé,
              <br />
              <span style={{ color: 'var(--text-3)' }}>au même endroit.</span>
            </h2>
            <p className="lp-lead" style={{ marginTop: 18, maxWidth: 430 }}>
              Tes découvertes, tes envies et tes souvenirs cessent d’être éparpillés entre captures
              d’écran et messages à toi-même.
            </p>
          </Reveal>

          <div className="lp-uses">
            {USES.map((u, i) => (
              <Reveal key={u.title} y={14} delay={80 + i * 90}>
                <div className="lp-use">
                  <h3 className="lp-use-title">{u.title}</h3>
                  <p className="lp-use-body">{u.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal y={26} delay={60} className="lp-carnet-device">
          <PhoneFrame width={292}>
            <Image
              src="/landing/app-favoris.png"
              alt="L’écran Enregistrés de Forkmap : imports, listes et restaurants sauvegardés"
              fill
              sizes="292px"
              style={{ objectFit: 'cover' }}
            />
          </PhoneFrame>
        </Reveal>
      </div>
    </section>
  )
}
