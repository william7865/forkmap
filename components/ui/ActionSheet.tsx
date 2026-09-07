'use client'
// ActionSheet — feuille d'actions iOS : backdrop + groupe arrondi d'actions
// (destructif en rouge) + bouton Annuler séparé. Remplace les menus dropdown
// ancrés (pattern web) partout dans l'app native. Présentation : monte du bas,
// respecte la safe-area, haptique au tap.
import { lightTap } from '@/lib/native/haptics'
import { Overlay } from '@/components/ui/Sheet'

export interface SheetAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
}

export default function ActionSheet({
  title,
  actions,
  onClose,
}: {
  /** En-tête optionnel (ex. nom du restaurant ou de la liste). */
  title?: string
  actions: SheetAction[]
  onClose: () => void
}) {
  return (
    <Overlay ariaLabel={title ?? 'Actions'} onClose={onClose} zIndex={2000}>
      {/* Feuille */}
      <div
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 'calc(var(--safe-bottom) + 10px)',
          animation: 'slideUp 260ms cubic-bezier(0.16,1,0.3,1) backwards',
          fontFamily: 'var(--font-body)',
        }}
      >
        <div
          style={{
            borderRadius: 'var(--r-2xl)',
            background: 'var(--bg)',
            boxShadow: 'var(--s4)',
            overflow: 'hidden',
          }}
        >
          {title && (
            <div
              style={{
                padding: '14px 18px 12px',
                textAlign: 'center',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span
                className="truncate-1"
                style={{
                  display: 'block',
                  fontFamily: 'var(--font-display)',
                  fontSize: 15.5,
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: 'var(--text-2)',
                }}
              >
                {title}
              </span>
            </div>
          )}
          {actions.map((a, i) => (
            <button
              key={a.label}
              onClick={() => {
                lightTap()
                onClose()
                a.onClick()
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 9,
                width: '100%',
                minHeight: 54,
                padding: '0 18px',
                border: 'none',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 16.5,
                fontWeight: a.danger ? 600 : 500,
                color: a.danger ? 'var(--closed)' : 'var(--text)',
              }}
            >
              {a.icon && (
                <span
                  style={{
                    display: 'flex',
                    color: a.danger ? 'var(--closed)' : 'var(--text-3)',
                  }}
                >
                  {a.icon}
                </span>
              )}
              {a.label}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{
            display: 'block',
            width: '100%',
            minHeight: 54,
            marginTop: 8,
            border: 'none',
            borderRadius: 'var(--r-2xl)',
            background: 'var(--bg)',
            boxShadow: 'var(--s4)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 16.5,
            fontWeight: 700,
            color: 'var(--text)',
          }}
        >
          Annuler
        </button>
      </div>
    </Overlay>
  )
}
