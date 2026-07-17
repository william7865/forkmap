'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { Camera } from 'lucide-react'
import type { FoursquarePhoto } from '@/types'

/** Build a sized Foursquare photo URL from its prefix/suffix + dimensions. */
export function buildPhotoUrl(photo: FoursquarePhoto, width = 600): string {
  return `${photo.prefix}${width}x${Math.round(width * (photo.height / photo.width))}${photo.suffix}`
}

/**
 * One gallery photo, fading up from the placeholder as it decodes instead of
 * hard-popping in.
 *
 * The fade is opt-IN, never opt-out: `loaded` starts false but a cached image
 * can finish decoding before React attaches onLoad, and a headless renderer may
 * never fire it at all. So the ref check below marks an already-complete image
 * loaded on mount — the photo is never gated behind an event that might not come.
 */
function GalleryImage({ url, priority }: { url: string; priority: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true)
  }, [])

  return (
    <Image
      ref={imgRef}
      src={url}
      alt=""
      fill
      sizes="100vw"
      priority={priority}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
      style={{
        objectFit: 'cover',
        opacity: loaded ? 1 : 0,
        transition: 'opacity var(--t3) var(--ease-out)',
      }}
    />
  )
}

/**
 * Horizontal swipeable photo strip with dot indicators.
 * Takes already-resolved URLs so user-uploaded photos and FSQ/Google photos
 * can be shown in the same gallery.
 */
export default function PhotoGallery({
  urls,
  attribution,
}: {
  urls: string[]
  /** Small credit label bottom-right; hidden when omitted (e.g. community photos). */
  attribution?: string
}) {
  const [activePhoto, setActivePhoto] = useState(0)
  const galleryRef = useRef<HTMLDivElement>(null)

  // Reset when the photo set changes (new place selected)
  useEffect(() => {
    setActivePhoto(0)
    if (galleryRef.current) galleryRef.current.scrollLeft = 0
  }, [urls])

  if (!urls.length) return null

  const handleGalleryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth)
    setActivePhoto(idx)
  }

  return (
    <div style={{ position: 'relative', flexShrink: 0, height: '100%' }}>
      {/* Horizontal scrollable strip — fills the hero it sits in (parent sets the
          height), so the photos never leave a grey band below them. */}
      <div
        ref={galleryRef}
        onScroll={handleGalleryScroll}
        className="no-scrollbar"
        style={{
          display: 'flex',
          height: '100%',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          gap: 0,
        }}
      >
        {urls.map((url, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: '100%',
              height: '100%',
              scrollSnapAlign: 'start',
              position: 'relative',
              // Photos resolve over the network: without a base the hero flashes
              // white before each one paints.
              background: 'var(--surface-2)',
            }}
          >
            <GalleryImage url={url} priority={i === 0} />
          </div>
        ))}
      </div>
      {/* Dot indicators */}
      {urls.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 4,
          }}
        >
          {urls.slice(0, 5).map((_, i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: i === activePhoto ? 'white' : 'rgba(255,255,255,0.45)',
                // scale, not width: keeps the dots off the layout path while
                // still marking position by size and not by opacity alone.
                transform: i === activePhoto ? 'scale(1.4)' : 'scale(1)',
                transition:
                  'background var(--t2) var(--ease-out), transform var(--t2) var(--ease-out)',
              }}
            />
          ))}
          {urls.length > 5 && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', alignSelf: 'center' }}>
              +{urls.length - 5}
            </span>
          )}
        </div>
      )}
      {/* Attribution */}
      {attribution && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 8,
            fontSize: 9,
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Camera size={9} strokeWidth={1.5} /> {attribution}
        </div>
      )}
    </div>
  )
}
