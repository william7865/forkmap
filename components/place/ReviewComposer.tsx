'use client'
// ReviewComposer — bottom sheet to write/edit a community review:
// star rating + optional text + up to 4 photos. Native-only UI.
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Star, X, Camera, Trash2 } from 'lucide-react'
import type { UserReview } from '@/types'
import { pickPhoto } from '@/lib/native/camera'
import { lightTap } from '@/lib/native/haptics'
import { canSubmit, REVIEW_TEXT_MAX, REVIEW_PHOTOS_MAX } from '@/lib/reviews'

interface PhotoSlot {
  key: string
  preview: string
  keepUrl?: string // existing photo to keep
  blob?: Blob // newly picked photo to upload
}

interface Props {
  initial: UserReview | null
  placeName: string
  onClose: () => void
  onSubmit: (input: {
    rating: number
    text: string
    newPhotos: Blob[]
    keepUrls: string[]
  }) => Promise<boolean>
  onDelete?: () => Promise<boolean>
}

export default function ReviewComposer({ initial, placeName, onClose, onSubmit, onDelete }: Props) {
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState(initial?.text ?? '')
  const [photos, setPhotos] = useState<PhotoSlot[]>(
    () => initial?.photo_urls.map((u, i) => ({ key: `keep-${i}`, preview: u, keepUrl: u })) ?? []
  )
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const seq = useRef(0)

  // Track the latest photos so the unmount cleanup sees session-added blobs
  // (a []-deps effect would capture only the initial, blob-less slots).
  const photosRef = useRef(photos)
  photosRef.current = photos
  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => p.blob && URL.revokeObjectURL(p.preview))
    }
  }, [])

  const addPhoto = async () => {
    if (photos.length >= REVIEW_PHOTOS_MAX) return
    try {
      const blob = await pickPhoto()
      if (!blob) return
      const preview = URL.createObjectURL(blob)
      setPhotos((prev) => [...prev, { key: `new-${seq.current++}`, preview, blob }])
    } catch {
      setErr('Impossible de sélectionner cette photo.')
    }
  }

  const removePhoto = (key: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.key === key)
      if (target?.blob) URL.revokeObjectURL(target.preview)
      return prev.filter((p) => p.key !== key)
    })
  }

  const submittable = canSubmit({ rating, text, photoCount: photos.length }) && rating >= 1

  const handleSubmit = async () => {
    if (!submittable || busy) return
    setBusy(true)
    setErr(null)
    const ok = await onSubmit({
      rating,
      text,
      newPhotos: photos.filter((p) => p.blob).map((p) => p.blob!),
      keepUrls: photos.filter((p) => p.keepUrl).map((p) => p.keepUrl!),
    })
    setBusy(false)
    if (ok) onClose()
    else setErr("L'envoi a échoué. Réessaie.")
  }

  const handleDelete = async () => {
    if (!onDelete || busy) return
    setBusy(true)
    setErr(null)
    const ok = await onDelete()
    setBusy(false)
    if (ok) onClose()
    else setErr('La suppression a échoué.')
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-slide-up"
        style={{
          width: '100%',
          maxWidth: 520,
          background: 'var(--white)',
          borderRadius: '20px 20px 0 0',
          padding: '18px 18px calc(18px + env(safe-area-inset-bottom))',
          maxHeight: '88vh',
          overflowY: 'auto',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 19,
              fontWeight: 600,
              color: 'var(--text)',
              margin: 0,
            }}
          >
            {initial ? 'Modifier mon avis' : 'Donner mon avis'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            style={{
              border: 'none',
              background: 'var(--surface)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-2)',
            }}
          >
            <X size={17} />
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '4px 0 16px' }}>{placeName}</p>

        {/* Star picker */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const filled = (hover || rating) >= n
            return (
              <button
                key={n}
                onClick={() => {
                  setRating(n)
                  void lightTap()
                }}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 2,
                  cursor: 'pointer',
                  lineHeight: 0,
                  transform: rating === n ? 'scale(1.14)' : 'scale(1)',
                  transition: 'transform 140ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <Star
                  size={34}
                  strokeWidth={1.5}
                  color="var(--accent)"
                  fill={filled ? 'var(--accent)' : 'transparent'}
                />
              </button>
            )
          })}
        </div>

        {/* Text */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, REVIEW_TEXT_MAX))}
          placeholder="Partage ton expérience (optionnel)…"
          rows={4}
          style={{
            width: '100%',
            resize: 'none',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: '11px 13px',
            fontSize: 14.5,
            fontFamily: 'var(--font-body)',
            color: 'var(--text)',
            background: 'var(--surface)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
          {text.length}/{REVIEW_TEXT_MAX}
        </div>

        {/* Photos */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          {photos.map((p) => (
            <div
              key={p.key}
              style={{ position: 'relative', width: 72, height: 72, borderRadius: 12, overflow: 'hidden' }}
            >
              <Image src={p.preview} alt="" fill sizes="72px" style={{ objectFit: 'cover' }} unoptimized />
              <button
                onClick={() => removePhoto(p.key)}
                aria-label="Retirer la photo"
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(0,0,0,0.55)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          {photos.length < REVIEW_PHOTOS_MAX && (
            <button
              onClick={addPhoto}
              aria-label="Ajouter une photo"
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                border: '1.5px dashed var(--border)',
                background: 'var(--surface)',
                color: 'var(--text-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Camera size={22} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {err && (
          <p style={{ color: 'var(--rating-low, #d33)', fontSize: 12.5, marginTop: 12 }}>{err}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 20 }}>
          {initial && onDelete && (
            <button
              onClick={handleDelete}
              disabled={busy}
              aria-label="Supprimer mon avis"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                borderRadius: 'var(--r-lg)',
                width: 46,
                height: 46,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: busy ? 'default' : 'pointer',
                color: 'var(--text-2)',
                flexShrink: 0,
              }}
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!submittable || busy}
            style={{
              flex: 1,
              height: 46,
              border: 'none',
              borderRadius: 'var(--r-lg)',
              background: submittable && !busy ? 'var(--accent)' : 'var(--border)',
              color: submittable && !busy ? 'var(--on-accent, #fff)' : 'var(--text-3)',
              fontSize: 15,
              fontWeight: 600,
              cursor: submittable && !busy ? 'pointer' : 'default',
              transition: 'background 150ms',
            }}
          >
            {busy ? 'Envoi…' : initial ? 'Mettre à jour' : 'Publier mon avis'}
          </button>
        </div>
      </div>
    </div>
  )
}
