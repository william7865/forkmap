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
            }}
          >
            <Image src={url} alt="" fill sizes="100vw" style={{ objectFit: 'cover' }} />
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
                transition: 'background 150ms',
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
