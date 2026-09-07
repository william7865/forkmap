'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Sheet, SheetHeader } from '@/components/ui/Sheet'
import { useLists } from '@/lib/hooks/useLists'
import type { ListVisibility } from '@/types'
import { CreateListModal } from './CreateListModal'
import { successTap, lightTap, errorTap } from '@/lib/native/haptics'
import { friendlyError } from '@/lib/api-errors'
import { clampPopupRight } from '@/lib/popup-position'
import { useIsNative } from '@/lib/native/platform'

/** Kept in sync with the popup's own maxWidth — the clamp below reasons about it. */
const POPUP_MAX_WIDTH = 280

interface Props {
  osmId: string
  placeSnapshot: Record<string, unknown>
  anchorRef: React.RefObject<HTMLElement | null>
  onClose: () => void
}

export function SaveToListPopup({ osmId, placeSnapshot, anchorRef, onClose }: Props) {
  const {
    lists,
    loading,
    fetchLists,
    createList,
    addItemToList,
    removeItemFromList,
    getListsForPlace,
  } = useLists()
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [position, setPosition] = useState({ top: 0, right: 0 })
  const [error, setError] = useState<string | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const native = useIsNative()

  useEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 8,
      right: clampPopupRight(rect.right, window.innerWidth, POPUP_MAX_WIDTH),
    })
  }, [anchorRef])

  useEffect(() => {
    fetchLists()
    getListsForPlace(osmId).then((ids) => setCheckedIds(new Set(ids)))
  }, [osmId, fetchLists, getListsForPlace])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Le CreateListModal est monté dans un portail séparé (hors de popupRef) :
      // ne pas fermer le popup quand on clique dedans, sinon le sous-formulaire disparaît.
      if (showCreate) return
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose, showCreate])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showCreate) return
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, showCreate])

  const toggle = async (listId: string) => {
    if (pendingIds.has(listId)) return
    setPendingIds((prev) => new Set(prev).add(listId))
    setError(null)
    try {
      if (checkedIds.has(listId)) {
        await removeItemFromList(listId, osmId)
        setCheckedIds((prev) => {
          const s = new Set(prev)
          s.delete(listId)
          return s
        })
        lightTap()
      } else {
        await addItemToList(listId, osmId, placeSnapshot)
        setCheckedIds((prev) => new Set(prev).add(listId))
        // The tick IS the confirmation — it lands on the row the user just
        // pressed, so nothing needs to float over the app to say so.
        successTap()
      }
    } catch (err) {
      // Without this the popup swallowed the failure: the checkbox just never
      // ticked and the user was never told the place hadn't been saved.
      setError(friendlyError(err))
      errorTap()
    } finally {
      setPendingIds((prev) => {
        const s = new Set(prev)
        s.delete(listId)
        return s
      })
    }
  }

  const handleCreate = async (
    name: string,
    description: string | null,
    visibility: ListVisibility
  ) => {
    setError(null)
    try {
      const created = await createList(name, description, visibility)
      await addItemToList(created.id, osmId, placeSnapshot)
      // The new list appears in the popup already ticked — that's the confirmation.
      setCheckedIds((prev) => new Set(prev).add(created.id))
      setShowCreate(false)
      successTap()
    } catch (err) {
      setError(friendlyError(err))
      setShowCreate(false)
      errorTap()
    }
  }

  const popup = (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        top: position.top,
        right: position.right,
        zIndex: 99999,
        background: 'var(--white)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        boxShadow: '0 8px 32px rgba(14,14,13,0.18)',
        minWidth: 220,
        maxWidth: POPUP_MAX_WIDTH,
        overflow: 'hidden',
        animation: 'popupIn 160ms var(--ease-out) backwards',
        transformOrigin: 'top right',
        fontFamily: 'var(--font-body)',
      }}
    >
      <div style={{ padding: '8px 12px 4px', borderBottom: '1px solid var(--border)' }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-3)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Enregistrer dans…
        </p>
      </div>
      {/* Failure is said here, inside the popup the user is looking at, rather
          than by something floating over the tab bar. */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '8px 12px',
            background: 'var(--closed-bg)',
            borderBottom: '1px solid var(--border)',
            fontSize: 11.5,
            lineHeight: 1.4,
            color: 'var(--closed)',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '12px', textAlign: 'center' }}>
            <div
              style={{
                width: 16,
                height: 16,
                border: '2px solid var(--bone)',
                borderTop: '2px solid var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
                display: 'inline-block',
              }}
            />
          </div>
        )}
        {!loading &&
          lists.map((list) => {
            const checked = checkedIds.has(list.id)
            const pending = pendingIds.has(list.id)
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => toggle(list.id)}
                disabled={pending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '9px 12px',
                  border: 'none',
                  background: checked ? 'var(--accent-light)' : 'transparent',
                  cursor: pending ? 'wait' : 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'background 120ms',
                }}
                onMouseEnter={(e) => {
                  if (!checked) e.currentTarget.style.background = 'var(--surface)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = checked ? 'var(--accent-light)' : 'transparent'
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--bone)'}`,
                    background: checked ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 120ms',
                  }}
                >
                  {checked && (
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: checked ? 'var(--accent)' : 'var(--text)',
                    fontWeight: checked ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {list.name}
                </span>
                <span style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>
                  ({list.item_count})
                </span>
              </button>
            )
          })}
        {!loading && lists.length === 0 && (
          <p
            style={{
              margin: 0,
              padding: '12px',
              fontSize: 12,
              color: 'var(--text-3)',
              textAlign: 'center',
            }}
          >
            Aucune liste encore
          </p>
        )}
      </div>
      <div style={{ borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontFamily: 'inherit',
            color: 'var(--accent)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-light)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Nouvelle liste</span>
        </button>
      </div>
      <style>{`
        @keyframes popupIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
      `}</style>
    </div>
  )

  // App native : bottom sheet (le popover ancré est un pattern web).
  const sheet = (
    <Sheet ariaLabel="Enregistrer dans une liste" onClose={onClose} zIndex={2000}>
      <SheetHeader title="Enregistrer dans…" />
      {error && (
        <div
          role="alert"
          style={{
            padding: '10px 20px',
            background: 'var(--closed-bg)',
            fontSize: 13,
            lineHeight: 1.4,
            color: 'var(--closed)',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ maxHeight: '46vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading && (
          <div style={{ padding: 18, textAlign: 'center' }}>
            <div
              style={{
                width: 18,
                height: 18,
                border: '2px solid var(--surface-2)',
                borderTop: '2px solid var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
                display: 'inline-block',
              }}
            />
          </div>
        )}
        {!loading &&
          lists.map((list) => {
            const checked = checkedIds.has(list.id)
            const pending = pendingIds.has(list.id)
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => toggle(list.id)}
                disabled={pending}
                className="tap-press"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  minHeight: 52,
                  padding: '0 20px',
                  border: 'none',
                  borderTop: '1px solid var(--border)',
                  background: 'transparent',
                  cursor: pending ? 'wait' : 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 15.5,
                    fontWeight: checked ? 700 : 500,
                    color: 'var(--text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {list.name}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
                  {list.item_count}
                </span>
                {/* Coche iOS à droite : présente = enregistré */}
                <span
                  aria-hidden
                  style={{
                    width: 22,
                    display: 'flex',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                  }}
                >
                  {checked && (
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </button>
            )
          })}
        {!loading && lists.length === 0 && (
          <p
            style={{
              margin: 0,
              padding: '16px 20px',
              fontSize: 13.5,
              color: 'var(--text-3)',
              textAlign: 'center',
              borderTop: '1px solid var(--border)',
            }}
          >
            Aucune liste encore
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => setShowCreate(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          minHeight: 52,
          padding: '0 20px',
          border: 'none',
          borderTop: '1px solid var(--border)',
          background: 'transparent',
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: 'var(--accent-text)',
          fontSize: 15.5,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Nouvelle liste
      </button>
    </Sheet>
  )

  return (
    <>
      {native ? sheet : typeof document !== 'undefined' && createPortal(popup, document.body)}
      {showCreate && <CreateListModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
    </>
  )
}
