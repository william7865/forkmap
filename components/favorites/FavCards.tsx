'use client'

// Restaurant card/row variants extracted from app/(pages)/favorites/page.tsx.
// Pure mechanical move — no behavior or rendering change.

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FavoriteRow, PlaceCard } from '@/types'
import type { ListRow as HookListRow } from '@/lib/hooks/useLists'
import { ListCard } from '@/components/lists/ListCard'
import { SaveToListPopup } from '@/components/lists/SaveToListPopup'
import { placeGradient } from '@/lib/gradients'
import { placeInitial, placePhotoUrl } from '@/components/place/PlaceThumb'
import { frCuisine } from '@/lib/cuisine'
import SwipeRow from '@/components/ui/SwipeRow'
import ActionSheet from '@/components/ui/ActionSheet'
import { useLongPress } from '@/lib/hooks/useLongPress'
import { useIsNative } from '@/lib/native/platform'
import { staggerDelay } from '@/lib/motion'
import { ChevronRight } from 'lucide-react'

// ── Icons ─────────────────────────────────────────────────
export const IcoTrash = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
  </svg>
)
export const IcoStar = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const IcoShare = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
)
export const IcoPen = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
  </svg>
)

const IcoUtensils = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2M5 2v20M11 2v7M11 2a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3v9" />
  </svg>
)

export const IcoListPlus = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 6h11M3 12h8M3 18h8" />
    <path d="M16 16h6M19 13v6" />
  </svg>
)

const IcoDots = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)

// ── Types ─────────────────────────────────────────────────
export interface ListItemEntry {
  id: string
  list_id: string
  osm_id: string
  place_snapshot: Record<string, unknown>
  added_at: string
}

// ── Fav card — liste ──────────────────────────────────────
export function favPhoto(fav: FavoriteRow, w = 240): string | null {
  // Mêmes sources que PlaceThumb : Google/FSQ → Wikimedia → Wikidata (plus de
  // Mapillary). Le snapshot EST un PlaceCard.
  return fav.snapshot ? placePhotoUrl(fav.snapshot as unknown as PlaceCard, w) : null
}

/**
 * Snapshot photos are plain `<img>`, never `next/image`.
 *
 * A snapshot stores whatever URL the client held when the place was saved, and a
 * mobile build stamps an absolute `https://forkmap.vercel.app/api/places/google-photo?…`
 * prefix. `next/image` throws "Invalid src prop" on any host missing from
 * `images.remotePatterns`, which took the whole page down with it. The proxy already
 * serves a sized image, so there is nothing left to optimise. On error the tile falls
 * back to its gradient, exactly like PlaceThumb does everywhere else.
 */
function FavPhoto({ src }: { src: string }) {
  const [broken, setBroken] = useState(false)
  if (broken) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  )
}

const MetaDot = () => (
  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-4)' }} />
)

// One "⋯" button → a portal menu of card actions (declutters the cards)
function CardActionsMenu({
  buttonRef,
  items,
}: {
  buttonRef: React.RefObject<HTMLButtonElement>
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[]
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const r = buttonRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) })
    const onDown = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      if (buttonRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const t = setTimeout(() => document.addEventListener('mousedown', onDown), 0)
    document.addEventListener('keydown', onEsc)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open, buttonRef])

  return (
    <>
      <ActionBtn
        btnRef={buttonRef}
        icon={<IcoDots />}
        label="Actions"
        active={open}
        onClick={() => setOpen((v) => !v)}
        small
      />
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: pos.top,
              right: pos.right,
              zIndex: 99999,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)',
              boxShadow: 'var(--s3)',
              minWidth: 184,
              overflow: 'hidden',
              padding: '4px 0',
              animation: 'scaleIn 140ms var(--ease-out) backwards',
              transformOrigin: 'top right',
              fontFamily: 'var(--font-body)',
            }}
          >
            {items.map((it) => (
              <button
                key={it.label}
                onClick={() => {
                  setOpen(false)
                  it.onClick()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 14px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  color: it.danger ? 'var(--coral)' : 'var(--text)',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = it.danger
                    ? 'var(--coral-pale)'
                    : 'var(--surface)')
                }
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span
                  style={{ display: 'flex', color: it.danger ? 'var(--coral)' : 'var(--text-3)' }}
                >
                  {it.icon}
                </span>
                {it.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  )
}

// Ligne-collection native : tap = ouvrir, swipe gauche = Renommer/Supprimer,
// appui long = action sheet complète. Chevron de navigation, pas de bouton ⋯.
export function NativeListRow({
  list,
  onOpen,
  onRename,
  onDelete,
}: {
  list: HookListRow
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}) {
  return (
    <>
      <SwipeRow
        contentBg="var(--surface)"
        actions={[
          { label: 'Renommer', bg: '#48484a', onClick: onRename },
          { label: 'Supprimer', bg: '#e5484d', onClick: onDelete },
        ]}
      >
        <div>
          <ListCard
            list={list}
            variant="row"
            onClick={onOpen}
            menu={
              <ChevronRight
                size={17}
                strokeWidth={2}
                style={{ color: 'var(--text-4)', flexShrink: 0 }}
              />
            }
          />
        </div>
      </SwipeRow>
    </>
  )
}

function Checkbox({ checked, overlay }: { checked: boolean; overlay?: boolean }) {
  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        flexShrink: 0,
        border: `2px solid ${checked ? 'var(--ember)' : overlay ? 'rgba(255,255,255,0.9)' : 'var(--border-strong)'}`,
        background: checked ? 'var(--ember)' : overlay ? 'rgba(0,0,0,0.25)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 120ms ease',
        marginTop: overlay ? 0 : 15,
        boxShadow: overlay ? '0 1px 4px rgba(0,0,0,0.25)' : 'none',
      }}
    >
      {checked && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  )
}

export function FavCardList({
  fav,
  index,
  note,
  visited,
  onRemove,
  onOpenMap,
  onShare,
  onNote,
  onListsChanged,
  selectMode,
  selected,
  onToggleSelect,
  sourceLabel,
}: {
  fav: FavoriteRow
  index: number
  note: string
  visited?: boolean
  onRemove: () => void
  onOpenMap: () => void
  onShare: () => void
  onNote: () => void
  onListsChanged?: () => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  sourceLabel?: string | null
}) {
  const cuisine = fav.snapshot?.cuisine ?? fav.snapshot?.fsq?.categories?.[0]?.name
  const rating = fav.snapshot?.fsq?.rating
  const openNow = fav.snapshot?.open_now
  const photo = favPhoto(fav)
  const listBtnRef = useRef<HTMLButtonElement>(null)
  const [showLists, setShowLists] = useState(false)
  const primary = selectMode ? onToggleSelect! : onOpenMap
  const nativeFav = useIsNative()

  // Natif : UN geste par contexte — les lignes se swipent (pattern Mail),
  // l'appui long est réservé à la grille. Note/Partage vivent dans la fiche.

  // ── App native : ligne « bibliothèque » (photo 66 + méta) ──
  // Actions : swipe gauche (Liste / Retirer) ou appui long (action sheet
  // complète) — plus de bouton ⋯, geste iOS.
  if (nativeFav) {
    const row = (
      <div
        className="anim-card-in"
        onClick={selectMode ? onToggleSelect : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          animationDelay: staggerDelay(index),
          cursor: selectMode ? 'pointer' : 'default',
        }}
      >
        {selectMode && <Checkbox checked={!!selected} />}

        {/* Photo — repli dégradé + initiale serif */}
        <button
          type="button"
          onClick={primary}
          aria-label={selectMode ? `Sélectionner ${fav.name}` : `Voir ${fav.name} sur la carte`}
          style={{
            position: 'relative',
            width: 72,
            height: 72,
            borderRadius: 16,
            overflow: 'hidden',
            flexShrink: 0,
            background: placeGradient(fav.osm_id),
            border: selected ? '2px solid var(--accent)' : 'none',
            boxShadow: 'var(--s1)',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {photo ? (
            <FavPhoto src={photo} />
          ) : (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontSize: 28,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.92)',
              }}
            >
              {placeInitial(fav.snapshot?.name ?? fav.name)}
            </span>
          )}
        </button>

        {/* Corps — nom serif + méta */}
        <button
          type="button"
          onClick={primary}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <p
            style={{
              margin: 0,
              // Albo grammar: venue names in bold sans (the serif is reserved for
              // the big screen title), tighter and a touch larger.
              fontFamily: 'var(--font-body)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fav.name}
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              marginTop: 5,
              flexWrap: 'wrap',
            }}
          >
            {rating != null && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: 'var(--text)',
                }}
              >
                <span style={{ color: 'var(--star)', display: 'flex' }}>
                  <IcoStar />
                </span>
                {rating.toFixed(1)}
              </span>
            )}
            {cuisine && (
              <>
                {rating != null && <MetaDot />}
                <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{frCuisine(cuisine)}</span>
              </>
            )}
            {openNow != null && (
              <>
                {(rating != null || cuisine) && <MetaDot />}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: openNow ? 'var(--open)' : 'var(--closed)',
                  }}
                >
                  <span
                    style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}
                  />
                  {openNow ? 'Ouvert' : 'Fermé'}
                </span>
              </>
            )}
            {sourceLabel && (
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· {sourceLabel}</span>
            )}
            {visited && (
              <span
                title="Déjà testé"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--open)',
                }}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Testé
              </span>
            )}
            {note && (
              <span
                title="Note personnelle"
                style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}
              />
            )}
          </div>
        </button>
      </div>
    )
    return (
      <>
        {selectMode ? (
          row
        ) : (
          <SwipeRow
            contentBg="var(--surface)"
            actions={[
              { label: 'Liste', bg: '#48484a', onClick: () => setShowLists(true) },
              { label: 'Retirer', bg: '#e5484d', onClick: onRemove },
            ]}
          >
            {row}
          </SwipeRow>
        )}
        {showLists && (
          <SaveToListPopup
            osmId={fav.osm_id}
            placeSnapshot={fav.snapshot as unknown as Record<string, unknown>}
            anchorRef={listBtnRef}
            onClose={() => {
              setShowLists(false)
              onListsChanged?.()
            }}
          />
        )}
      </>
    )
  }

  return (
    <div
      className="anim-card-in"
      onClick={selectMode ? onToggleSelect : undefined}
      style={{
        background: selected ? 'var(--ember-light)' : 'var(--bg)',
        borderRadius: 'var(--r-xl)',
        padding: 12,
        display: 'flex',
        gap: 13,
        alignItems: 'center',
        border: `1px solid ${selected ? 'var(--ember)' : 'var(--border)'}`,
        boxShadow: 'var(--s1)',
        animationDelay: staggerDelay(index),
        cursor: selectMode ? 'pointer' : 'default',
        transition: 'box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease',
      }}
      onMouseEnter={(e) => {
        if (selectMode) return
        e.currentTarget.style.boxShadow = 'var(--s3)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--s1)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {selectMode && <Checkbox checked={!!selected} />}

      {/* Thumbnail — photo or warm fallback */}
      <button
        type="button"
        onClick={primary}
        aria-label={selectMode ? `Sélectionner ${fav.name}` : `Voir ${fav.name} sur la carte`}
        style={{
          position: 'relative',
          width: 68,
          height: 68,
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          background: placeGradient(fav.osm_id),
          border: 'none',
          flexShrink: 0,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        {photo ? (
          <FavPhoto src={photo} />
        ) : (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <IcoUtensils />
          </span>
        )}
      </button>

      {/* Content */}
      <button
        type="button"
        onClick={primary}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <p
          style={{
            margin: '0 0 5px',
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.01em',
            lineHeight: 1.18,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {fav.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {rating != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--ember-text)',
                background: 'var(--ember-light)',
                borderRadius: 'var(--r-pill)',
                padding: '2px 8px',
              }}
            >
              <IcoStar /> {rating.toFixed(1)}
            </span>
          )}
          {cuisine && (
            <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{frCuisine(cuisine)}</span>
          )}
          {openNow != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: openNow ? 'var(--open)' : 'var(--closed)',
              }}
            >
              <span
                style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}
              />
              {openNow ? 'Ouvert' : 'Fermé'}
            </span>
          )}
          {note && (
            <span
              title="Note personnelle"
              style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }}
            />
          )}
        </div>
      </button>

      {/* Actions — single overflow menu */}
      {!selectMode && (
        <div style={{ flexShrink: 0 }}>
          <CardActionsMenu
            buttonRef={listBtnRef}
            items={[
              {
                label: 'Ajouter à une liste',
                icon: <IcoListPlus />,
                onClick: () => setShowLists(true),
              },
              {
                label: note ? 'Modifier la note' : 'Ajouter une note',
                icon: <IcoPen />,
                onClick: onNote,
              },
              { label: 'Partager', icon: <IcoShare />, onClick: onShare },
              { label: 'Retirer', icon: <IcoTrash />, onClick: onRemove, danger: true },
            ]}
          />
        </div>
      )}

      {showLists && (
        <SaveToListPopup
          osmId={fav.osm_id}
          placeSnapshot={fav.snapshot as unknown as Record<string, unknown>}
          anchorRef={listBtnRef}
          onClose={() => {
            setShowLists(false)
            onListsChanged?.()
          }}
        />
      )}
    </div>
  )
}

// ── Ligne d'un lieu de liste (natif) ──────────────────────
// Même langage « bibliothèque » que FavCardList (vignette 66 + nom serif + méta
// à points), mais actions propres au détail d'une liste : ouvrir sur la carte,
// retirer de la liste.
export function ListItemRowNative({
  item,
  index,
  n,
  done,
  onOpenMap,
  onRemove,
}: {
  item: ListItemEntry
  index: number
  /** Le numéro de la pastille correspondante sur le plan, en haut d'écran. */
  n: number
  /** Déjà visité : la pastille devient creuse, comme sur le plan. */
  done: boolean
  onOpenMap: () => void
  onRemove: () => void
}) {
  const snap = item.place_snapshot as unknown as PlaceCard
  const name = snap?.name ?? item.osm_id
  const cuisine = snap?.cuisine ?? snap?.fsq?.categories?.[0]?.name
  const rating = snap?.fsq?.rating
  const openNow = snap?.open_now
  // Swipe gauche = retirer (geste unique des lignes). Pas de bouton ⋯.
  const row = (
    <div
      className="anim-card-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        animationDelay: staggerDelay(index),
      }}
    >
      {/* La pastille numérotée, pas une vignette : c'est le seul lien entre
          cette ligne et le plan du haut. Pleine = à tester, creuse = testée. */}
      <button
        type="button"
        onClick={onOpenMap}
        aria-label={`Voir ${name} sur la carte`}
        style={{
          width: 24,
          height: 24,
          borderRadius: 999,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          cursor: 'pointer',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 11,
          lineHeight: 1,
          background: done ? 'transparent' : 'var(--accent)',
          color: done ? 'var(--text-3)' : 'var(--on-accent)',
          border: done ? '1.5px solid var(--text-4, var(--border))' : 'none',
        }}
      >
        {n}
      </button>

      {/* Corps — nom serif + méta */}
      <button
        type="button"
        onClick={onOpenMap}
        style={{
          flex: 1,
          minWidth: 0,
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: 16.5,
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </p>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 5, flexWrap: 'wrap' }}
        >
          {rating != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 11.5,
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              <span style={{ color: 'var(--star)', display: 'flex' }}>
                <IcoStar />
              </span>
              {rating.toFixed(1)}
            </span>
          )}
          {cuisine && (
            <>
              {rating != null && <MetaDot />}
              <span style={{ fontSize: 12.5, color: 'var(--text-2)' }}>{frCuisine(cuisine)}</span>
            </>
          )}
          {openNow != null && (
            <>
              {(rating != null || cuisine) && <MetaDot />}
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: openNow ? 'var(--open)' : 'var(--closed)',
                }}
              >
                <span
                  style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }}
                />
                {openNow ? 'Ouvert' : 'Fermé'}
              </span>
            </>
          )}
        </div>
      </button>
    </div>
  )

  return (
    <>
      <SwipeRow
        contentBg="var(--surface)"
        actions={[{ label: 'Retirer', bg: '#e5484d', onClick: onRemove }]}
      >
        {row}
      </SwipeRow>
    </>
  )
}

// ── Fav card — grille ─────────────────────────────────────
export function FavCardGrid({
  fav,
  index,
  onRemove,
  onOpenMap,
  onListsChanged,
  selectMode,
  selected,
  onToggleSelect,
}: {
  fav: FavoriteRow
  index: number
  onRemove: () => void
  onOpenMap: () => void
  onListsChanged?: () => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const rating = fav.snapshot?.fsq?.rating
  const cuisine = fav.snapshot?.cuisine ?? fav.snapshot?.fsq?.categories?.[0]?.name
  const photo = favPhoto(fav, 400)
  const listBtnRef = useRef<HTMLButtonElement>(null)
  const [showLists, setShowLists] = useState(false)
  const primary = selectMode ? onToggleSelect! : onOpenMap
  // Natif : la grille ne peut pas swiper → appui long = action sheet, pas de ⋯.
  const nativeGrid = useIsNative()
  const [sheetOpen, setSheetOpen] = useState(false)
  const longPress = useLongPress(() => setSheetOpen(true))

  return (
    <div
      className="anim-card-in"
      onClick={selectMode ? onToggleSelect : undefined}
      {...(nativeGrid && !selectMode ? longPress : {})}
      style={{
        background: selected ? 'var(--ember-light)' : 'var(--bg)',
        borderRadius: 'var(--r-xl)',
        overflow: 'hidden',
        border: `1px solid ${selected ? 'var(--ember)' : 'var(--border)'}`,
        boxShadow: 'var(--s1)',
        animationDelay: staggerDelay(index),
        display: 'flex',
        flexDirection: 'column',
        cursor: selectMode ? 'pointer' : 'default',
        transition: 'box-shadow 160ms ease, transform 160ms ease, border-color 160ms ease',
      }}
      onMouseEnter={(e) => {
        if (selectMode) return
        e.currentTarget.style.boxShadow = 'var(--s3)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'var(--s1)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Thumbnail — photo or warm fallback */}
      <button
        type="button"
        onClick={primary}
        aria-label={selectMode ? `Sélectionner ${fav.name}` : `Voir ${fav.name} sur la carte`}
        style={{
          height: 132,
          background: placeGradient(fav.osm_id),
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          position: 'relative',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {photo ? (
          <FavPhoto src={photo} />
        ) : (
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            <IcoUtensils />
          </span>
        )}
        {/* legibility scrim for the badge */}
        <span
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.18), transparent 38%)',
            pointerEvents: 'none',
          }}
        />
        {selectMode && (
          <span style={{ position: 'absolute', top: 10, left: 10 }}>
            <Checkbox checked={!!selected} overlay />
          </span>
        )}
        {rating != null && (
          <span
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
              padding: '3px 9px',
              borderRadius: 'var(--r-pill)',
              fontSize: 11,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.95)',
              color: 'var(--ember-text)',
            }}
          >
            <IcoStar /> {rating.toFixed(1)}
          </span>
        )}
      </button>
      {/* Body */}
      <div style={{ padding: '11px 13px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={primary}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
          }}
        >
          <p
            style={{
              margin: '0 0 2px',
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text)',
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fav.name}
          </p>
          {cuisine && (
            <p
              style={{
                margin: 0,
                fontSize: 11.5,
                color: 'var(--text-2)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {frCuisine(cuisine)}
            </p>
          )}
        </button>
        {!selectMode && !nativeGrid && (
          <CardActionsMenu
            buttonRef={listBtnRef}
            items={[
              {
                label: 'Ajouter à une liste',
                icon: <IcoListPlus />,
                onClick: () => setShowLists(true),
              },
              { label: 'Retirer', icon: <IcoTrash />, onClick: onRemove, danger: true },
            ]}
          />
        )}
      </div>

      {sheetOpen && (
        <ActionSheet
          title={fav.name}
          actions={[
            {
              label: 'Ajouter à une liste',
              icon: <IcoListPlus />,
              onClick: () => setShowLists(true),
            },
            { label: 'Retirer', icon: <IcoTrash />, onClick: onRemove, danger: true },
          ]}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {showLists && (
        <SaveToListPopup
          osmId={fav.osm_id}
          placeSnapshot={fav.snapshot as unknown as Record<string, unknown>}
          anchorRef={listBtnRef}
          onClose={() => {
            setShowLists(false)
            onListsChanged?.()
          }}
        />
      )}
    </div>
  )
}

// ── Action button helper ──────────────────────────────────
function ActionBtn({
  icon,
  label,
  active,
  activeColor,
  activeBg,
  hoverColor,
  hoverBg,
  onClick,
  small,
  btnRef,
}: {
  icon: React.ReactNode
  label?: string
  active?: boolean
  activeColor?: string
  activeBg?: string
  hoverColor?: string
  hoverBg?: string
  onClick: () => void
  small?: boolean
  btnRef?: React.Ref<HTMLButtonElement>
}) {
  const sz = small ? 28 : 30
  const bg = active ? (activeBg ?? 'var(--accent-light)') : 'var(--surface)'
  const color = active ? (activeColor ?? 'var(--accent)') : 'var(--text-3)'
  const border = active
    ? `1px solid ${activeColor ? activeColor + '44' : 'var(--border-strong)'}`
    : '1px solid var(--border)'
  return (
    <button
      ref={btnRef}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={label}
      aria-label={label}
      style={{
        width: sz,
        height: sz,
        minWidth: 44,
        minHeight: 44,
        borderRadius: 'var(--r-sm)',
        border,
        background: bg,
        color,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 140ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverBg ?? activeBg ?? 'var(--cream)'
        e.currentTarget.style.color = hoverColor ?? activeColor ?? 'var(--text)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = bg
        e.currentTarget.style.color = color
      }}
    >
      {icon}
    </button>
  )
}

// ════════════════════════════════════════════════════════════
// APERÇUS DE TRAITEMENT — deux façons de montrer les mêmes
// adresses, à comparer sur l'appareil avant de trancher.
//
// Constat qui les motive : le Carnet range 144 restaurants avec
// leurs photos et leurs notes dans des vignettes de 38px, sous
// quatre couches de filtres. C'est un annuaire. Les apps qui
// paraissent vivantes (Letterboxd, Beli, BeReal) font l'inverse :
// le contenu occupe l'écran, le chrome disparaît. La matière
// première est déjà là — elle est juste rangée trop petit.
//
// Les deux variantes ne changent NI la palette NI la typo : on
// isole une seule question, la place donnée au contenu.
// ════════════════════════════════════════════════════════════

// ── Tuile du mur (traitement « P · trois sections ») ──
// Carrée, la photo occupe tout, nom et note posés dessus. Le voile n'est pas
// décoratif : sans lui, un nom blanc sur une assiette claire devient illisible.
export function FavCardWall({
  fav,
  index,
  onOpenMap,
}: {
  fav: FavoriteRow
  index: number
  onOpenMap: () => void
}) {
  const photo = favPhoto(fav, 320)
  const rating = fav.snapshot?.fsq?.rating

  return (
    <button
      type="button"
      onClick={onOpenMap}
      className="tap-press anim-fade-up"
      style={{
        animationDelay: staggerDelay(index),
        position: 'relative',
        aspectRatio: '1',
        overflow: 'hidden',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        background: photo ? 'var(--surface-2)' : placeGradient(fav.osm_id),
      }}
    >
      {/* FavPhoto et non un <img> brut : un lien photo stocké dans un snapshot
         peut avoir expiré (proxy Google), et un <img> cassé affiche l'icône
         « image manquante » d'iOS en plein milieu de la tuile. FavPhoto
         retombe silencieusement sur le dégradé — constaté sur l'appareil. */}
      {photo && <FavPhoto src={photo} />}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 46%)',
        }}
      />
      {rating != null && (
        <span
          style={{
            position: 'absolute',
            top: 5,
            right: 6,
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 1px 3px rgba(0,0,0,0.9)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {rating.toFixed(1)}
        </span>
      )}
      <span
        className="truncate-2"
        style={{
          position: 'absolute',
          left: 6,
          right: 6,
          bottom: 5,
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.15,
          color: '#fff',
          textAlign: 'left',
          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
        }}
      >
        {fav.name}
      </span>
    </button>
  )
}
