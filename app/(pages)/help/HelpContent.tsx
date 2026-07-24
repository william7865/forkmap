'use client'

import { useState } from 'react'
import Link from 'next/link'
import { InfoPage } from '@/components/ui/PageLayout'

interface FAQItem {
  q: string
  a: string | React.ReactNode
  category: string
}

const FAQS: FAQItem[] = [
  // Pour commencer
  {
    category: 'Pour commencer',
    q: 'Comment rechercher des restaurants ?',
    a: 'Saisissez un nom de restaurant ou un type de cuisine dans la barre de recherche en haut de la carte. Les résultats se filtrent en temps réel au fur et à mesure que vous tapez. Vous pouvez aussi explorer la carte en la déplaçant et en zoomant : la liste de la barre latérale se met à jour automatiquement pour afficher ce qui se trouve dans la vue actuelle.',
  },
  {
    category: 'Pour commencer',
    q: 'Comment définir mon point de départ ?',
    a: "Il existe trois façons : (1) Cliquez sur « Me localiser » dans la barre latérale, Forkmap utilisera le GPS de votre appareil. (2) Saisissez une adresse dans le champ du point de départ et choisissez une suggestion. (3) Cliquez sur « Placer le départ » dans l'en-tête, puis cliquez n'importe où sur la carte.",
  },
  {
    category: 'Pour commencer',
    q: 'Que signifie le score ?',
    a: "Le score est une combinaison pondérée de la note, du nombre d'avis et de la proximité. Un score élevé indique un restaurant bien noté et proche de vous. Vous pouvez trier par score, distance, note ou nom à l'aide des filtres.",
  },

  // Favoris
  {
    category: 'Favoris',
    q: 'Comment enregistrer un restaurant dans mes favoris ?',
    a: "Cliquez sur l'icône marque-page sur n'importe quelle fiche de restaurant dans la barre latérale ou dans le panneau de détails. Le marque-page se remplit une fois le lieu enregistré. Vous devez être connecté pour que vos favoris soient conservés. Sinon ils sont perdus au rechargement de la page.",
  },
  {
    category: 'Favoris',
    q: 'Où puis-je voir mes restaurants enregistrés ?',
    a: "Cliquez sur « Enregistrés » dans l'en-tête, ou ouvrez le menu de votre compte → « Lieux enregistrés ». Vos favoris sont triés par date d'enregistrement par défaut, avec la possibilité de trier par ordre alphabétique ou par type de cuisine.",
  },
  {
    category: 'Favoris',
    q: 'Puis-je ouvrir un restaurant enregistré sur la carte ?',
    a: "Oui. Sur la page Lieux enregistrés, cliquez sur n'importe quelle fiche de restaurant : la carte se centrera sur ce restaurant et ouvrira son panneau de détails.",
  },

  // Itinéraire
  {
    category: 'Itinéraire',
    q: 'Comment obtenir un itinéraire vers un restaurant ?',
    a: "Définissez d'abord un point de départ (GPS, adresse ou repère). Cliquez ensuite sur un restaurant pour ouvrir son panneau de détails. L'itinéraire est calculé automatiquement et affiché sur la carte. Utilisez les onglets (À pied / Vélo / Transports / Voiture) pour changer de mode de transport.",
  },
  {
    category: 'Itinéraire',
    q: "Pourquoi l'itinéraire ne s'affiche-t-il pas ?",
    a: "Les itinéraires nécessitent un point de départ. Assurez-vous d'en avoir défini un via la barre latérale (GPS ou adresse) ou avec le bouton « Placer le départ ». Si l'itinéraire ne s'affiche toujours pas, le service de calcul d'itinéraire est peut-être temporairement indisponible. Réessayez dans un instant.",
  },

  // Filtres
  {
    category: 'Filtres',
    q: 'Comment utiliser les filtres ?',
    a: "Cliquez sur « Filtres » dans l'en-tête pour ouvrir le panneau de filtres. Vous pouvez filtrer par note minimale, nombre d'avis, niveau de prix, type de cuisine et selon qu'un établissement est actuellement ouvert. Les filtres s'appliquent immédiatement : la liste et la carte se mettent à jour en temps réel.",
  },
  {
    category: 'Filtres',
    q: 'Comment réinitialiser les filtres ?',
    a: 'Cliquez sur « Filtres » pour ouvrir le panneau, puis sur « Tout réinitialiser » en bas, ou fermez le panneau et cliquez sur le bouton orange des filtres qui affiche un badge indiquant le nombre de filtres actifs.',
  },

  // Compte
  {
    category: 'Compte',
    q: "Ai-je besoin d'un compte pour utiliser Forkmap ?",
    a: "Non. Vous pouvez explorer, rechercher, filtrer et obtenir des itinéraires sans compte. Un compte n'est requis que pour enregistrer vos restaurants favoris d'une session et d'un appareil à l'autre.",
  },
  {
    category: 'Compte',
    q: 'Comment créer un compte ?',
    a: 'Cliquez sur « Se connecter » en haut à droite. Choisissez « Créer un compte » et saisissez votre adresse e-mail et un mot de passe, ou utilisez « Continuer avec Google » pour une inscription en un clic.',
  },
  {
    category: 'Compte',
    q: 'Comment supprimer mon compte ?',
    a: "Allez dans Compte → Paramètres (ou Paramètres dans le menu) → faites défiler jusqu'à « Zone de danger » → « Supprimer le compte ». Il vous sera demandé de confirmer en saisissant votre adresse e-mail. Cette action supprime définitivement votre compte et toutes vos données enregistrées.",
  },

  // Données
  {
    category: 'Données & fiabilité',
    q: "D'où proviennent les données sur les restaurants ?",
    a: "Les emplacements, noms, adresses, horaires d'ouverture et types de cuisine proviennent de cartes maintenues par des communautés de bénévoles ; les notes et le nombre d'avis viennent de partenaires spécialisés. Le détail des fournisseurs et de leurs licences figure sur la page Attribution des données.",
  },
  {
    category: 'Données & fiabilité',
    q: "Les données d'un restaurant sont erronées. Que puis-je faire ?",
    a: "Les données d'OpenStreetMap sont modifiées par des bénévoles. Si vous trouvez une erreur, vous pouvez la corriger directement sur openstreetmap.org, votre correction apparaîtra dans Forkmap sous quelques jours. Vous pouvez aussi nous contacter via la page Contact.",
  },
]

const CATEGORIES = [...new Set(FAQS.map((f) => f.category))]

// Rules and rows stop at the text measure instead of spanning the 720px container.
const MEASURE = 560

export default function HelpContent() {
  const [open, setOpen] = useState<string | null>(null)
  const [cat, setCat] = useState<string>('Tout')
  const [search, setSearch] = useState('')

  const filtered = FAQS.filter((f) => {
    const matchCat = cat === 'Tout' || f.category === cat
    const matchQ =
      search.trim() === '' ||
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      (typeof f.a === 'string' && f.a.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchQ
  })

  // Grouped by category, in the declared order. The heading carries the category,
  // so each row no longer repeats it as a pill.
  const groups = CATEGORIES.map((c) => ({
    category: c,
    items: filtered.filter((f) => f.category === c),
  })).filter((g) => g.items.length > 0)

  return (
    <InfoPage maxWidth={720}>
      <h1
        style={{
          margin: '0 0 16px',
          fontSize: 'clamp(28px, 7vw, 36px)',
          fontWeight: 600,
          letterSpacing: '-0.05em',
          lineHeight: 1.2,
          color: 'var(--text)',
          maxWidth: 480,
          textWrap: 'balance',
        }}
      >
        Aide & FAQ
      </h1>
      <p
        style={{
          margin: '0 0 36px',
          fontSize: 16,
          color: 'var(--text-2)',
          lineHeight: 1.75,
          maxWidth: 560,
        }}
      >
        Les réponses aux questions qu’on nous pose le plus souvent. Si la vôtre n’y est pas,
        écrivez-nous.
      </p>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: MEASURE }}>
        <span
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-2)',
            display: 'flex',
            pointerEvents: 'none',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </span>
        <input
          type="text"
          placeholder="Rechercher une question…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Rechercher dans la FAQ"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 14px 10px 38px',
            borderRadius: 10,
            border: '1.5px solid var(--b2)',
            background: 'var(--bg)',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 120ms, box-shadow 120ms',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(25,28,29,0.15)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--b2)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      {/* Category filter */}
      <div
        style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 44, maxWidth: MEASURE }}
      >
        {['Tout', ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{
              padding: '5px 13px',
              borderRadius: 999,
              border: cat === c ? '1.5px solid var(--accent)' : '1.5px solid var(--b2)',
              background: cat === c ? 'rgba(25,28,29,0.15)' : 'transparent',
              color: cat === c ? 'var(--accent-hover)' : 'var(--text-2)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 120ms',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* FAQ list */}
      {filtered.length === 0 ? (
        <div
          style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-2)', fontSize: 13 }}
        >
          Aucun résultat pour &laquo;&nbsp;{search}&nbsp;&raquo;
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 44 }}>
          {groups.map((group) => (
            <section key={group.category}>
              <h2
                style={{
                  margin: '0 0 4px',
                  fontSize: 17,
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: 'var(--text)',
                  paddingBottom: 10,
                  borderBottom: '1px solid var(--border)',
                  maxWidth: MEASURE,
                }}
              >
                {group.category}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {group.items.map((faq) => {
                  const isOpen = open === faq.q
                  return (
                    <div
                      key={faq.q}
                      style={{ borderBottom: '1px solid var(--b1)', maxWidth: MEASURE }}
                    >
                      <button
                        onClick={() => setOpen(isOpen ? null : faq.q)}
                        aria-expanded={isOpen}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 2px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'inherit',
                          gap: 12,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13.5,
                            fontWeight: isOpen ? 600 : 500,
                            color: 'var(--text)',
                            letterSpacing: '-0.01em',
                            lineHeight: 1.4,
                          }}
                        >
                          {faq.q}
                        </span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--text-3)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          style={{
                            transform: isOpen ? 'rotate(180deg)' : 'none',
                            transition: 'transform 200ms var(--ease-out)',
                            flexShrink: 0,
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div
                          style={{
                            padding: '0 2px 16px',
                            fontSize: 13,
                            color: 'var(--text-2)',
                            lineHeight: 1.75,
                            maxWidth: MEASURE,
                            animation: 'fadeUp 150ms var(--ease-out) backwards',
                          }}
                        >
                          {faq.a}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Still stuck CTA — same shape as the one closing /about */}
      <div
        style={{
          marginTop: 72,
          maxWidth: MEASURE,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)',
          padding: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              margin: '0 0 6px',
              fontSize: 19,
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
            }}
          >
            Toujours bloqué&nbsp;?
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
            Envoyez-nous un message et nous vous aiderons.
          </p>
        </div>
        <Link
          href="/contact"
          style={{
            padding: '11px 24px',
            borderRadius: 'var(--r-md)',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            boxShadow: 'var(--s-accent)',
            flexShrink: 0,
          }}
        >
          Nous contacter →
        </Link>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </InfoPage>
  )
}
