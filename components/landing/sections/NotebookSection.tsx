import Shot from '../Shot'
import { Reveal } from '../useReveal'

// Ton carnet — la section de la PLURALITÉ. Un seul artefact, mais qui contient
// BEAUCOUP d'objets : le rail des adresses vues sur les réseaux. Pas de
// téléphone (voir Shot.tsx) — il n'y en a qu'un sur la page, dans le hero.
//
// Rythme horizontal, à l'opposé de L'import qui descend en séquence numérotée :
// ici trois usages parallèles, sans ordre, alignés sous un filet.
//
// ⚠️ Le rail est volontairement CONTENU (≈560px) et non pleine largeur : la
// capture source ne fait que 804px de large, donc l'afficher à 1100px+ le
// remontait à un upscale ×2.9 en dpr2 — flou. La largeur d'affichage d'un Shot
// ne doit pas trop dépasser la largeur en pixels de sa région source.

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
        className="lp-wrap"
        style={{ paddingTop: 'clamp(72px, 9vw, 116px)', paddingBottom: 'clamp(72px, 9vw, 116px)' }}
      >
        <div className="lp-carnet-top">
          <Reveal y={18}>
            <h2 className="lp-h2">
              Tout ce que tu as aimé,
              <br />
              <span style={{ color: 'var(--text-3)' }}>au même endroit.</span>
            </h2>
            <p className="lp-lead" style={{ marginTop: 18, maxWidth: 420 }}>
              Tes découvertes, tes envies et tes souvenirs cessent d’être éparpillés entre captures
              d’écran et messages à toi-même.
            </p>
          </Reveal>

          {/* Le rail est coupé net à droite, comme dans l'app : il continue
             au-delà du cadre. C'est ce débordement qui dit « il y en a d'autres ». */}
          <Reveal y={24} delay={80} className="lp-rail">
            <Shot
              src="/landing/app-favoris.png"
              alt="Les adresses vues sur les réseaux et enregistrées : Septime, Kodawari Ramen, un bar à vin du 11e, une adresse en cours d’analyse"
              x={32}
              y={356}
              w={772}
              h={420}
              radius={0}
              sizes="(max-width: 980px) 92vw, 560px"
            />
          </Reveal>
        </div>

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
    </section>
  )
}
