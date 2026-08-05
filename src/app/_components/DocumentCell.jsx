'use client'
import React, { useState } from 'react'
import { photoUrl } from '@/app/_helpers/media'

export const StatusPill = ({ state }) => {
  const styles = {
    verified: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    missing: 'bg-gray-100 text-gray-500',
  }
  const labels = { verified: 'Verified', pending: 'Pending', missing: 'Not submitted' }
  return <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${styles[state]}`}>{labels[state]}</span>
}

// Lightbox for a document scan. Images come from the private bucket, so the
// src must go through photoUrl() — a raw bucket URL 403s.
export const DocumentImage = ({ src, label }) => {
  const [open, setOpen] = useState(false)
  if (!src) return <span className='text-xs text-[#959595]'>No image</span>

  return (
    <>
      <button onClick={() => setOpen(true)} className='text-xs font-semibold text-blue-600 underline'>
        View {label}
      </button>
      {open && (
        <div className='fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6'
          onClick={() => setOpen(false)}>
          <div className='bg-white rounded-md p-3 max-w-3xl max-h-full overflow-auto'
            onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-2'>
              <p className='text-sm font-semibold'>{label}</p>
              <button onClick={() => setOpen(false)} className='text-sm text-[#757575] px-2'>✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(src)} alt={label} className='max-w-full max-h-[75vh] object-contain' />
          </div>
        </div>
      )}
    </>
  )
}

// Verify / un-verify pair. Un-verify matters: a document approved by mistake
// has to be reversible, and the reversal is what the activity log records.
export const VerifyActions = ({ state, busy, onVerify, onUnverify }) => {
  if (state === 'missing') return <span className='text-xs text-[#959595]'>—</span>
  if (state === 'verified') {
    return (
      <button disabled={busy} onClick={onUnverify} className='text-xs font-semibold text-[#757575]'>
        Un-verify
      </button>
    )
  }
  return (
    <button disabled={busy} onClick={onVerify}
      className='text-xs font-semibold bg-[#ECC032] text-black px-3 py-1 rounded-md disabled:opacity-50'>
      {busy ? '…' : 'Verify'}
    </button>
  )
}

// A visible thumbnail, not a text link.
//
// Aadhaar and PAN numbers are masked server-side on purpose, so the SCAN is
// what the reviewer actually reads the number from. A link buried under the
// fields makes the masked text look primary and the document optional — which
// is backwards. Showing the image up front puts the artifact first.
export const DocumentThumb = ({ src, label }) => {
  const [open, setOpen] = useState(false)
  if (!src) {
    return (
      <div className='w-full h-28 rounded border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center'>
        <span className='text-[11px] text-[#959595]'>No {label.toLowerCase()}</span>
      </div>
    )
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className='block w-full group' title={`Open ${label}`}>
        <div className='w-full h-28 rounded border border-gray-200 overflow-hidden bg-gray-50'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl(src)} alt={label}
            className='w-full h-full object-cover group-hover:opacity-90' />
        </div>
        <span className='block text-[10px] text-[#757575] mt-1 text-left'>
          {label} — click to enlarge
        </span>
      </button>

      {open && (
        <div className='fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6'
          onClick={() => setOpen(false)}>
          <div className='bg-white rounded-md p-3 max-w-4xl max-h-full overflow-auto'
            onClick={(e) => e.stopPropagation()}>
            <div className='flex justify-between items-center mb-2'>
              <p className='text-sm font-semibold'>{label}</p>
              <button onClick={() => setOpen(false)} className='text-sm text-[#757575] px-2'>✕</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(src)} alt={label} className='max-w-full max-h-[80vh] object-contain' />
          </div>
        </div>
      )}
    </>
  )
}

export const docState = (has, verified) => (!has ? 'missing' : verified ? 'verified' : 'pending')
