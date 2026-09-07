import { MOODS } from '@/lib/surprise'
import Shot from '../Shot'
import { Reveal } from '../useReveal'

// Découvrir / Surprends-moi — la section de la DÉCISION : une seule adresse,
// tranchée. Le visuel dit la même chose que le propos : un artefact unique,
// centré, posé dans le noir. Pas de téléphone (il n'y en a qu'un sur la page,
// dans le hero) — c'est la carte du deck telle qu'elle sort de l'app.
//
// Progression volontaire d'une section à l'autre : L'import montre DEUX objets
// (avant → après), Découvrir UN seul, Ton carnet BEAUCOUP. Une par une, une, en
// grand nombre — chaque section a sa quantité, donc sa forme.
//
// Les humeurs viennent de MOODS (lib/surprise.ts), la source du deck réel :
// la landing ne peut pas raconter autre chose que ce que l'app propose.

export default function DiscoverSection() {
  return (
    <section id="decouvrir" className="lp-dark">
      <div
        className="lp-wrap"
        style={{
          paddingTop: 'clamp(76px, 10vw, 132px)',
          paddingBottom: 'clamp(76px, 10vw, 132px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Reveal y={18}>
          <h2 className="lp-h2 lp-h2-dark" style={{ maxWidth: 12 * 46, marginInline: 'auto' }}>
            Tu ne sais pas quoi manger.
            <br />
            <span style={{ color: 'var(--star)' }}>Lui, si.</span>
          </h2>
          <p
            className="lp-lead lp-lead-dark"
            style={{ marginTop: 18, maxWidth: 500, marginInline: 'auto' }}
          >
            Une carte vivante de restaurants réels, notés et classés autour de toi. Et quand tu
            hésites, « Surprends-moi » tranche pour toi — selon ton envie du moment.
          </p>
        </Reveal>

        <div className="lp-moods">
          {MOODS.map((m, i) => (
            <Reveal key={m.id} y={14} delay={90 + i * 70} duration={560}>
              <span className="lp-mood">{m.label}</span>
            </Reveal>
          ))}
        </div>

        {/* L'adresse proposée, telle quelle. Une lueur la décolle du noir —
           sans elle, une carte sombre sur fond sombre disparaît. */}
        <Reveal y={30} delay={180} className="lp-pick">
          <div className="lp-glow">
            <Shot
              src="/landing/app-decouvrir.png"
              alt="L’adresse proposée par « Surprends-moi » : Bouillon Pigalle, français, noté 8,5, ouvert, à 38 min à pied"
              x={33}
              y={388}
              w={739}
              h={1074}
              radius={20}
              sizes="(max-width: 980px) 82vw, 330px"
            />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
