// A CSS-only iPhone bezel for the landing mockups. No image asset — the screen
// content is passed as children so each section can show a different "screen"
// while sharing one device frame. Web-only (the landing never renders on native).
export default function PhoneFrame({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: 288,
        maxWidth: '100%',
        // Inner-screen ratio matches the app screenshot (402×874) so cover shows
        // the whole screen — nav bar included — with no crop.
        aspectRatio: '288 / 600',
        borderRadius: 46,
        padding: 11,
        background: 'linear-gradient(150deg, #2a2b2d 0%, #111214 55%, #202123 100%)',
        boxShadow:
          '0 42px 90px -28px rgba(25,28,29,0.45), 0 8px 24px -12px rgba(25,28,29,0.3), inset 0 0 0 1.5px rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 35,
          overflow: 'hidden',
          background: 'var(--bg)',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
          // WebKit doesn't clip a rounded `overflow:hidden` box when an ancestor
          // is transform-animated (the floating hero) — the screenshot leaked past
          // the bottom corners on Safari. Own compositing layer + mask force the clip.
          isolation: 'isolate',
          transform: 'translateZ(0)',
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
        }}
      >
        {/* No drawn notch: the app screenshot carries its own status bar + Dynamic Island. */}
        {children}
      </div>
    </div>
  )
}
