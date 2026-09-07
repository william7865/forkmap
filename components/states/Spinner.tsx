'use client'
// components/states/Spinner.tsx — les deux seuls spinners de l'app.
//
// `Spinner` : rondelle 14px posée dans un bouton (`light` sur fond accent).
// `PageSpinner` : chargement plein écran d'un onglet avant hydratation.
// Toute nouvelle attente passe par l'un des deux — ne pas en recoder un.

export function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span
      style={{
        width: 14,
        height: 14,
        border: `2px solid ${light ? 'rgba(255,255,255,0.4)' : 'var(--b2)'}`,
        borderTop: `2px solid ${light ? '#fff' : 'var(--ink)'}`,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
      }}
    />
  )
}

export function PageSpinner({ background = 'var(--bg)' }: { background?: string }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          border: '2px solid var(--b2)',
          borderTop: '2px solid var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
    </div>
  )
}
