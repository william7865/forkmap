// A CSS-only iPhone bezel for the landing mockups. No image asset — the screen
// content is passed as children so each section can show a different "screen"
// while sharing one device frame. Web-only (the landing never renders on native).

// The screenshots in public/landing are 804×1748. The inner screen MUST carry
// that exact ratio: with `objectFit: cover`, any mismatch crops the shot, and
// what gets eaten is the top and bottom — the status bar and the tab bar, i.e.
// the two things that make it read as a real app. Deriving the frame from these
// constants instead of hardcoding a ratio keeps them from drifting apart again.
const SHOT_W = 804
const SHOT_H = 1748

export default function PhoneFrame({
  children,
  width = 300,
  style,
}: {
  children: React.ReactNode
  /** Screen width in px. Sections vary it to rank themselves — the flagship gets the biggest device. */
  width?: number
  style?: React.CSSProperties
}) {
  const pad = Math.round(width * 0.038)
  const radius = Math.round(width * 0.155)

  return (
    <div
      aria-hidden="true"
      style={{
        width: width + pad * 2,
        maxWidth: '100%',
        borderRadius: radius + pad,
        padding: pad,
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
          aspectRatio: `${SHOT_W} / ${SHOT_H}`,
          borderRadius: radius,
          overflow: 'hidden',
          background: 'var(--bg)',
          boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
          // WebKit doesn't clip a rounded `overflow:hidden` box when an ancestor
          // is transform-animated — the screenshot leaked past the bottom corners
          // on Safari. Own compositing layer + mask force the clip.
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
