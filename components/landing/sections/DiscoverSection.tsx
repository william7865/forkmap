import Image from 'next/image'
import { MOODS } from '@/lib/surprise'
import PhoneFrame from '../PhoneFrame'
import { Reveal } from '../useReveal'

// Découvrir / Surprends-moi — le seul plein écran de la page : une idée, une
// colonne, centrée. Là où L'import déroule une séquence en deux colonnes, ici
// tout converge vers l'appareil.
//
// Le noir précédent (#141310) avalait le téléphone : bezel sombre sur fond
// sombre, l'objet disparaissait. Une source de lumière derrière l'écran le
// décolle du fond — c'est de la profondeur, pas de la décoration.
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
          position: 'relative',
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

        {/* Le deck : les humeurs réelles, distribuées comme des cartes. */}
        <div className="lp-moods">
          {MOODS.map((m, i) => (
            <Reveal key={m.id} y={14} delay={90 + i * 70} duration={560}>
              <span className="lp-mood">{m.label}</span>
            </Reveal>
          ))}
        </div>

        <Reveal y={30} delay={180} className="lp-discover-device">
          <div className="lp-glow">
            <PhoneFrame width={318}>
              <Image
                src="/landing/app-decouvrir.png"
                alt="Le mode « Surprends-moi » de Forkmap propose une adresse — ici Bouillon Pigalle — selon ton envie"
                fill
                sizes="318px"
                style={{ objectFit: 'cover' }}
              />
            </PhoneFrame>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
