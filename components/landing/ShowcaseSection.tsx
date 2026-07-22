import Image from 'next/image'
import { Check } from 'lucide-react'
import PhoneFrame from './PhoneFrame'
import { Reveal } from './useReveal'

// One alternating "phone + copy" band. The phone holds a real app screenshot;
// the copy sits opposite it. `tone` drives the palette so one section can be a
// dark band for rhythm. On mobile everything stacks with the phone on top.
export default function ShowcaseSection({
  id,
  kicker,
  title,
  body,
  points,
  img,
  alt,
  phoneSide = 'right',
  tone = 'surface',
}: {
  id: string
  kicker: string
  title: string
  body: string
  points?: string[]
  img: string
  alt: string
  phoneSide?: 'left' | 'right'
  tone?: 'surface' | 'dark'
}) {
  const dark = tone === 'dark'
  const ink = dark ? '#f4f2ee' : 'var(--text)'
  const sub = dark ? 'rgba(244,242,238,0.7)' : 'var(--text-2)'
  const faint = dark ? 'rgba(244,242,238,0.5)' : 'var(--text-3)'

  const phone = (
    <div className="lp-showcase-device" style={{ display: 'flex', justifyContent: 'center' }}>
      <Reveal y={26}>
        <div className="lp-float">
          <PhoneFrame>
            <Image src={img} alt={alt} fill sizes="288px" style={{ objectFit: 'cover' }} />
          </PhoneFrame>
        </div>
      </Reveal>
    </div>
  )

  const copy = (
    <Reveal y={16}>
      <span
        style={{
          display: 'inline-block',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: faint,
        }}
      >
        {kicker}
      </span>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(26px, 3.4vw, 38px)',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          fontWeight: 600,
          color: ink,
          margin: '12px 0 0',
        }}
      >
        {title}
      </h2>
      <p style={{ fontSize: 16, lineHeight: 1.6, color: sub, margin: '16px 0 0', maxWidth: 460 }}>
        {body}
      </p>
      {points && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '20px 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
          }}
        >
          {points.map((p) => (
            <li
              key={p}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: 14.5,
                lineHeight: 1.5,
                color: sub,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: dark ? 'rgba(245,166,35,0.16)' : 'var(--accent-light)',
                  color: dark ? 'var(--star)' : 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  marginTop: 1,
                }}
              >
                <Check size={13} strokeWidth={2.6} />
              </span>
              {p}
            </li>
          ))}
        </ul>
      )}
    </Reveal>
  )

  return (
    <section
      id={id}
      style={{
        background: dark ? '#141310' : 'var(--surface)',
        borderTop: dark ? 'none' : '1px solid var(--border)',
        borderBottom: dark ? 'none' : '1px solid var(--border)',
      }}
    >
      <div
        className="lp-showcase lp-wrap"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'center',
          gap: 48,
          paddingTop: 68,
          paddingBottom: 68,
        }}
      >
        {phoneSide === 'left' ? (
          <>
            {phone}
            {copy}
          </>
        ) : (
          <>
            {copy}
            {phone}
          </>
        )}
      </div>
    </section>
  )
}
