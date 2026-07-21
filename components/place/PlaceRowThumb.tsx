'use client'
// components/place/PlaceRowThumb.tsx
// La tuile photo 96px des lignes-liste natives (PlaceCard ET HomeEditorial, qui
// dupliquaient ce bloc au risque de diverger). Elle encapsule :
//   - PlaceThumb (photo, ou tuile-score/initiale en repli) ;
//   - les overlays note + « Fermé », rendus SEULEMENT sur une vraie photo (via
//     la prop `overlay` de PlaceThumb) — sinon la tuile-score porte déjà la note ;
//   - le badge « amis qui ont enregistré », optionnel (`showFriends`).
// La logique de LIGNE (états sélection/survol, animations, favori) reste dans
// chaque appelant : elle diffère légitimement.
import { Star } from 'lucide-react'
import type { PlaceCard } from '@/types'
import PlaceThumb from '@/components/place/PlaceThumb'
import { Avatar } from '@/components/social/Avatar'

const ratingBadge = (rating: number) => (
  <div
    style={{
      position: 'absolute',
      top: 6,
      left: 6,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      padding: '3px 7px 3px 5px',
      borderRadius: 999,
      background: 'rgba(16,16,17,0.72)',
      backdropFilter: 'blur(6px)',
      color: '#fff',
      fontSize: 11.5,
      fontWeight: 800,
      letterSpacing: '-0.01em',
    }}
  >
    <Star size={11} strokeWidth={0} fill="var(--star)" />
    {rating.toFixed(1)}
  </div>
)

const closedVeil = (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: 'rgba(16,16,17,0.55)',
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingBottom: 7,
      fontSize: 10.5,
      fontWeight: 800,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: '#fff',
    }}
  >
    Fermé
  </div>
)

export default function PlaceRowThumb({
  place,
  selected = false,
  showFriends = false,
}: {
  place: PlaceCard
  /** Bordure d'accent quand la ligne est sélectionnée (liste principale). */
  selected?: boolean
  /** Afficher le badge « amis qui ont enregistré » (liste principale uniquement). */
  showFriends?: boolean
}) {
  const rating = place.fsq?.rating
  const friends = place.friendsSaved ?? []

  return (
    <div
      style={{
        position: 'relative',
        width: 96,
        height: 96,
        borderRadius: 18,
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: 'var(--s1)',
        border: selected ? '2px solid var(--accent)' : 'none',
      }}
    >
      <PlaceThumb
        place={place}
        initialSize={34}
        photoSize={256}
        overlay={
          <>
            {rating != null && ratingBadge(rating)}
            {place.open_now === false && closedVeil}
          </>
        }
      />

      {showFriends && friends.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            background: 'rgba(255,255,255,0.94)',
            backdropFilter: 'blur(4px)',
            borderRadius: 999,
            padding: '2px 6px 2px 3px',
            boxShadow: 'var(--s1)',
          }}
        >
          <div style={{ display: 'flex' }}>
            {friends.slice(0, 2).map((f, i) => (
              <div
                key={f.id}
                style={{
                  marginLeft: i === 0 ? 0 : -6,
                  boxShadow: '0 0 0 1.5px #fff',
                  borderRadius: '50%',
                }}
              >
                <Avatar name={f.display_name} src={f.avatar_url} id={f.id} size={14} />
              </div>
            ))}
          </div>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text)' }}>
            {friends.length}
          </span>
        </div>
      )}
    </div>
  )
}
