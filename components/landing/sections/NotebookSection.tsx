import Shot from '../Shot'
import { Reveal } from '../useReveal'

// Ton carnet — la section de la PLURALITÉ. Pas de téléphone (voir Shot.tsx) :
// on montre les adresses enregistrées elles-mêmes.
//
// Le rail est RECOMPOSÉ en HTML, pas découpé d'un bloc dans la capture. Le
// découpage en un seul morceau coupait les légendes en bas et un nom en plein
// milieu à droite — ça se lisait comme une capture ratée. Ici chaque photo est
// recadrée sur ses bornes exactes (208×296 px dans la source, mesurées) et les
// noms sont du vrai texte : ils restent nets à tous les zooms au lieu d'être
// des pixels agrandis.
//
// ⚠️ Plafond de netteté : la capture source ne fait que 804 px de large, donc
// chaque vignette n'a que 208 px. Affichée à ~150 px CSS elle est déjà en
// upscale ×1.4 sur un écran Retina. Pour aller au-delà il faut des captures
// @3x (1206×2622), pas un changement de code.

const SAVED = [
  { x: 32, name: 'Septime', src: 'Instagram' },
  { x: 260, name: 'Kodawari Ramen', src: 'TikTok' },
  { x: 488, name: 'Ce bar à vin caché du 11e', src: 'Reels' },
]
const PHOTO = { y: 366, w: 208, h: 296 }

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

          <div className="lp-saved">
            {SAVED.map((s, i) => (
              <Reveal key={s.name} y={20} delay={60 + i * 90}>
                <figure className="lp-saved-item">
                  <Shot
                    src="/landing/app-favoris.png"
                    alt={`${s.name}, enregistré depuis ${s.src}`}
                    x={s.x}
                    y={PHOTO.y}
                    w={PHOTO.w}
                    h={PHOTO.h}
                    radius={12}
                    sizes="(max-width: 980px) 30vw, 160px"
                  />
                  <figcaption>
                    <span className="lp-saved-name">{s.name}</span>
                    <span className="lp-saved-src">{s.src}</span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
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
