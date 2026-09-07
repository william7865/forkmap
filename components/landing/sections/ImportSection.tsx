import Image from 'next/image'
import PhoneFrame from '../PhoneFrame'
import { Reveal } from '../useReveal'

// L'import — la fonction phare, et la seule section qui est vraiment une
// SÉQUENCE (partager → reconnaître → ranger). C'est ce qui justifie les
// numéros ici et nulle part ailleurs sur la page : ils portent l'ordre, ils
// ne décorent pas un titre. Le titre traverse toute la largeur au lieu d'être
// coincé dans une demi-grille, et l'appareil est le plus grand de la page —
// c'est la fonction qui n'existe nulle part ailleurs, elle mène le rythme.

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
    <section
      id="import"
      style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div
        className="lp-wrap"
        style={{ paddingTop: 'clamp(72px, 9vw, 120px)', paddingBottom: 'clamp(72px, 9vw, 120px)' }}
      >
        {/* Chapô en deux colonnes : le titre tient la gauche, le paragraphe
           s'aligne sur sa dernière ligne à droite. La tête occupe la largeur. */}
        <Reveal y={18}>
          <div className="lp-import-head">
            <h2 className="lp-h2">
              Un resto vu en vidéo,
              <br />
              <span style={{ color: 'var(--text-3)' }}>sauvé en un geste.</span>
            </h2>
            <p className="lp-lead">
              La fonctionnalité qui n’existe nulle part ailleurs. Tu ne notes plus le nom dans tes
              messages à toi-même : tu partages, et c’est rangé.
            </p>
          </div>
        </Reveal>

        <div className="lp-import-grid">
          <Reveal y={26} delay={60} className="lp-import-device">
            <PhoneFrame width={330}>
              <Image
                src="/landing/app-import.png"
                alt="Une vidéo Instagram reconnue par Forkmap : le restaurant Kodawari Ramen, noté 9,1"
                fill
                sizes="330px"
                style={{ objectFit: 'cover' }}
              />
            </PhoneFrame>
          </Reveal>

          {/* La séquence. Le filet vertical relie les trois temps : l'œil suit
             l'ordre au lieu de lire trois puces interchangeables. */}
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
