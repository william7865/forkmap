'use client'
// Sheet — the app's single modal-presentation primitive (iOS-style).
// One backdrop, one animation timing, one grabber, one safe-area rule for the
// whole app: every bottom sheet composes <Sheet>, every centered dialog
// composes <Dialog>. Do NOT hand-roll `position:fixed` + backdrop + slideUp in
// feature components — that is exactly the duplication this file removes.
import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, X } from 'lucide-react'
import { lightTap } from '@/lib/native/haptics'

/** Locks background page scroll while the host component is mounted. */
export function useScrollLock(): void {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
}

const BACKDROP: CSSProperties = {
  position: 'absolute',
  inset: 0,
  border: 'none',
  background: 'rgba(0,0,0,0.38)',
  animation: 'fadeIn 180ms var(--ease-out) backwards',
  cursor: 'default',
}

/** Backdrop + portal + scroll-lock shell — building block for custom panels (ActionSheet). */
export function Overlay({
  ariaLabel,
  onClose,
  zIndex,
  children,
}: {
  ariaLabel: string
  onClose: () => void
  zIndex: number
  children: ReactNode
}) {
  useScrollLock()
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      // React portals bubble events through the REACT tree: without this stop,
      // a tap inside the sheet would also hit the opener's own backdrop/handlers.
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'fixed', inset: 0, zIndex }}
    >
      <button aria-label="Fermer" onClick={onClose} style={BACKDROP} />
      {children}
    </div>,
    document.body
  )
}

/**
 * Bottom sheet docked to the screen edge (share, save, notifications…).
 * Children scroll inside; header rows should set `flexShrink: 0`.
 */
export function Sheet({
  ariaLabel,
  onClose,
  children,
  maxHeight = '72vh',
  zIndex = 1600,
  grabber = true,
  style,
}: {
  ariaLabel: string
  onClose: () => void
  children: ReactNode
  /** Panel cap — pass '86vh' for tall content, a number for fixed px. */
  maxHeight?: number | string
  zIndex?: number
  grabber?: boolean
  /** Extra panel styles (e.g. background override). Layout keys win over yours. */
  style?: CSSProperties
}) {
  return (
    <Overlay ariaLabel={ariaLabel} onClose={onClose} zIndex={zIndex}>
      <div
        style={{
          background: 'var(--bg)',
          ...style,
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
          boxShadow: 'var(--s4)',
          paddingBottom: 'calc(var(--safe-bottom) + 8px)',
          animation: 'slideUp 260ms var(--ease-out) backwards',
          fontFamily: 'var(--font-body)',
        }}
      >
        {grabber && (
          <div
            aria-hidden
            style={{
              width: 36,
              height: 4,
              borderRadius: 999,
              background: 'var(--border-strong)',
              margin: '10px auto 0',
              flexShrink: 0,
            }}
          />
        )}
        {children}
      </div>
    </Overlay>
  )
}

/** Centered dialog (settings prompts, confirmations, composers on web). */
export function Dialog({
  ariaLabel,
  onClose,
  children,
  maxWidth = 520,
  zIndex = 1600,
  style,
}: {
  ariaLabel: string
  onClose: () => void
  children: ReactNode
  maxWidth?: number
  zIndex?: number
  style?: CSSProperties
}) {
  return (
    <Overlay ariaLabel={ariaLabel} onClose={onClose} zIndex={zIndex}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'var(--bg)',
            ...style,
            width: '100%',
            maxWidth,
            maxHeight: '86vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 'var(--r-2xl)',
            boxShadow: 'var(--s4)',
            overflow: 'hidden',
            animation: 'scaleIn 200ms var(--ease-out) backwards',
            fontFamily: 'var(--font-body)',
            pointerEvents: 'auto',
          }}
        >
          {children}
        </div>
      </div>
    </Overlay>
  )
}

/**
 * Shared header row for sheets, dialogs and full-screen views:
 * optional back chevron / close cross, display-font title, optional subtitle,
 * optional trailing action slot.
 */
export function SheetHeader({
  title,
  subtitle,
  onBack,
  onClose,
  action,
  align = 'center',
}: {
  title: string
  subtitle?: ReactNode
  onBack?: () => void
  onClose?: () => void
  action?: ReactNode
  align?: 'center' | 'left'
}) {
  const iconBtn: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--surface)',
    color: 'var(--text-2)',
    cursor: 'pointer',
    flexShrink: 0,
  }
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        flexShrink: 0,
      }}
    >
      {onBack && (
        <button
          aria-label="Retour"
          onClick={() => {
            lightTap()
            onBack()
          }}
          style={iconBtn}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
      )}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: align,
          // Keep the title optically centered when only one side has a button.
          paddingLeft: align === 'center' && !onBack && (onClose || action) ? 46 : 0,
          paddingRight: align === 'center' && onBack && !onClose && !action ? 46 : 0,
        }}
      >
        <span
          className="truncate-1"
          style={{
            display: 'block',
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'var(--text)',
          }}
        >
          {title}
        </span>
        {subtitle != null && (
          <span
            className="truncate-1"
            style={{ display: 'block', marginTop: 3, fontSize: 12.5, color: 'var(--text-3)' }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {action}
      {onClose && (
        <button
          aria-label="Fermer"
          onClick={() => {
            lightTap()
            onClose()
          }}
          style={iconBtn}
        >
          <X size={19} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
