import Shot from '../Shot'
import { Reveal } from '../useReveal'

// L'import — la fonction phare, et la seule section qui est une SÉQUENCE
// (partager → reconnaître → ranger). D'où les numéros ici et nulle part
// ailleurs : ils portent l'ordre, ils ne décorent pas un titre.
//
// Visuel : pas de téléphone. On montre la TRANSFORMATION elle-même, recadrée
// dans la capture réelle — la vidéo Instagram en haut, la fiche que Forkmap en
// a tirée en dessous. C'est l'argument de la section, montré plutôt que décrit.

const STEPS = [
  {
    n: '01',
    title: 'Tu partages la vidéo',
    body: 'Depuis TikTok, Instagram, Reels ou YouTube — le bouton Partager, puis Forkmap.',
  },
  {
    n: '02',
    title: 'Forkmap retrouve le lieu',
    body: 'Même quand le nom du restaurant n’est écrit nulle part : légende, son, décor, géoloc.',
  },
  {
    n: '03',
    title: 'Il atterrit dans ton carnet',
    body: 'Avec sa note, son adresse, ses horaires. Rangé, prêt pour le jour où tu y vas.',
  },
]

const SOURCES = ['TikTok', 'Instagram', 'Reels', 'YouTube']

export default function ImportSection() {
  return (
    <section id="import" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
      <div
        className="lp-wrap"
        style={{ paddingTop: 'clamp(72px, 9vw, 120px)', paddingBottom: 'clamp(72px, 9vw, 120px)' }}
      >
        <Reveal y={18}>
          <h2 className="lp-h2">
            Un resto vu en vidéo,
            <br />
            <span style={{ color: 'var(--text-3)' }}>sauvé en un geste.</span>
          </h2>
          <p className="lp-lead" style={{ marginTop: 18, maxWidth: 460 }}>
            Tu ne notes plus le nom dans tes messages à toi-même : tu partages, et c’est rangé.
          </p>
        </Reveal>

        <div className="lp-import-grid">
          {/* La transformation : le post d'origine, puis ce que Forkmap en tire. */}
          <div className="lp-transform">
            <Reveal y={24}>
              <figure className="lp-artifact lp-artifact-video">
                <Shot
                  src="/landing/app-import.png"
                  alt="Une vidéo de ramen partagée depuis Instagram par @ramenlover"
                  // Le cadrage démarre à 140 et pas au bord du conteneur vidéo
                  // (108) : l'app y laisse dépasser un badge turquoise que son
                  // propre coin arrondi rogne. Recadré hors contexte, ce demi-
                  // badge se lisait comme un défaut d'affichage.
                  x={35}
                  y={140}
                  w={735}
                  h={878}
                  radius={16}
                  sizes="(max-width: 980px) 84vw, 540px"
                />
                <figcaption className="lp-artifact-tag">La vidéo que tu partages</figcaption>
              </figure>
            </Reveal>

            <Reveal y={20} delay={200}>
              <figure className="lp-artifact lp-artifact-card">
                <Shot
                  src="/landing/app-import.png"
                  alt="La fiche trouvée par Forkmap : Kodawari Ramen, Ramen, ouvert, noté 9,1"
                  x={55}
                  y={1286}
                  w={693}
                  h={186}
                  radius={12}
                  sizes="(max-width: 980px) 84vw, 540px"
                />
                <figcaption className="lp-artifact-tag">Ce que Forkmap en retrouve</figcaption>
              </figure>
            </Reveal>
          </div>

          <ol className="lp-steps">
            {STEPS.map((s, i) => (
              // Le <li> reste l'enfant direct du <ol> (un <div> intercalé serait
              // du HTML invalide) et porte le filet ; Reveal anime son contenu.
              <li key={s.n} className="lp-step">
                <Reveal y={16} delay={120 + i * 110} className="lp-step-in">
                  <span className="lp-step-n">{s.n}</span>
                  <div>
                    <h3 className="lp-step-title">{s.title}</h3>
                    <p className="lp-step-body">{s.body}</p>
                    {i === 0 && (
                      <div className="lp-sources">
                        {SOURCES.map((src) => (
                          <span key={src} className="lp-source">
                            {src}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
