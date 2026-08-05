'use client'
import { useState } from 'react'
import { photoUrl } from '@/app/_helpers/media'

// Side-by-side face comparison for identity review.
//
// ── What this is, and what it is not ──
// It is a VIEWER, not a matcher. There is no face-recognition provider wired up
// here, and pretending otherwise would be worse than useless: an admin who
// believes the software checked the faces stops checking them properly, which
// is the exact failure mode this screen exists to prevent. The decision stays
// the reviewer's; this makes it possible to make it well.
//
// The problem it solves is mundane and real. The selfie, the Aadhaar and the
// licence each sat in their own card, so comparing faces meant opening three
// lightboxes in turn and holding two of them in your head. Faces are compared
// by looking at them together — so they go together, at a usable size, with
// zoom, because a licence photo is a postage stamp on the scan.
//
// The selfie is pinned as the reference: it is the one image captured live and
// under our control, so it is what the documents are checked against.
const Panel = ({ label, src, sub, zoom, onZoom }) => (
  <div className='flex-1 min-w-[180px]'>
    <div className='flex items-baseline justify-between gap-2 mb-1.5'>
      <p className='text-[11px] uppercase tracking-tight text-[#959595] font-semibold'>{label}</p>
      {sub && <p className='text-[10px] text-[#bbb]'>{sub}</p>}
    </div>
    {src ? (
      <div
        className='relative w-full aspect-square rounded-md overflow-hidden bg-[#111] cursor-zoom-in'
        onClick={onZoom}
        title='Click to enlarge'
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl(src)}
          alt={label}
          className='w-full h-full object-cover transition-transform duration-150'
          style={{ transform: `scale(${zoom})` }}
        />
      </div>
    ) : (
      <div className='w-full aspect-square rounded-md bg-[#f5f5f5] border border-dashed border-gray-200 grid place-items-center'>
        <p className='text-[11px] text-[#959595] px-3 text-center'>Not submitted</p>
      </div>
    )}
  </div>
)

export default function FaceCompare({ selfie, aadhaarFront, licenceFront }) {
  // One zoom for all three panels. Comparing two faces at different
  // magnifications is actively misleading — differences in apparent size read
  // as differences in the face.
  const [zoom, setZoom] = useState(1)
  const [lightbox, setLightbox] = useState(null)

  const nothing = !selfie && !aadhaarFront && !licenceFront
  if (nothing) return null

  return (
    <div className='bg-white border border-gray-100 rounded-md p-5 mb-4'>
      <div className='flex items-start justify-between gap-3 mb-1'>
        <p className='font-semibold text-sm'>Face comparison</p>
        <div className='flex items-center gap-2'>
          <span className='text-[10px] text-[#959595]'>Zoom</span>
          <input
            type='range' min='1' max='3' step='0.1' value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className='w-24 accent-[#ECC032]'
          />
          {zoom > 1 && (
            <button onClick={() => setZoom(1)} className='text-[10px] font-semibold text-[#757575]'>
              Reset
            </button>
          )}
        </div>
      </div>
      <p className='text-[11px] text-[#959595] mb-4'>
        The live selfie next to both document photos. Zoom applies to all three, so
        they stay comparable.
        {/* Said plainly, because an admin who assumes the system checked the
            faces will stop checking them properly. */}
        {' '}<span className='text-[#757575]'>No automatic face matching is performed — this is your call.</span>
      </p>

      <div className='flex flex-wrap gap-4'>
        <Panel label='Live selfie' sub='captured in-app' src={selfie} zoom={zoom}
          onZoom={() => setLightbox({ src: selfie, label: 'Live selfie' })} />
        <Panel label='Aadhaar' sub='front of card' src={aadhaarFront} zoom={zoom}
          onZoom={() => setLightbox({ src: aadhaarFront, label: 'Aadhaar (front)' })} />
        <Panel label='Driving licence' sub='front' src={licenceFront} zoom={zoom}
          onZoom={() => setLightbox({ src: licenceFront, label: 'Driving licence (front)' })} />
      </div>

      {!selfie && (
        // The selfie is the reference image; without it the other two can only
        // be compared to each other, which proves much less.
        <p className='text-[11px] text-amber-700 mt-3'>
          No live selfie on file, so there is nothing to compare the documents against.
        </p>
      )}

      {lightbox && (
        <div className='fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6'
          onClick={() => setLightbox(null)}>
          <div className='max-w-4xl w-full' onClick={(e) => e.stopPropagation()}>
            <div className='flex items-center justify-between mb-2'>
              <p className='text-sm text-white font-semibold'>{lightbox.label}</p>
              <button onClick={() => setLightbox(null)} className='text-sm text-white/70 hover:text-white'>
                Close
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(lightbox.src)} alt={lightbox.label}
              className='w-full max-h-[80vh] object-contain rounded-md' />
          </div>
        </div>
      )}
    </div>
  )
}
