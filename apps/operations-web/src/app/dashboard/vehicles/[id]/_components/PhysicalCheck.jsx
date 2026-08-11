'use client'
import React, { useRef, useState } from 'react'
import { photoUrl } from '@cocarr/shared-utils'
import { coreApi } from '@cocarr/api-sdk'
import { ErrorToast } from '@cocarr/notifications'
import { DOC_PILL, DOC_LABEL } from '@/app/_helpers/vehicleStatus'

// One in-person check: its verdict, its evidence, and the two buttons.
//
// MODULE SCOPE, not nested in the page component. A component defined inside
// another component's render is a new type on every render, so React remounts
// it — which here would drop the file input and close the lightbox mid-upload.
// The same mistake is called out three times in the mobile and admin CLAUDE.md
// files; it is not hypothetical.

// Uploads one file and returns the OBJECT KEY.
//
// Deliberately NOT `${url}${fields.key}`, which is what SingleImageHolder does
// and what the repos' CLAUDE.md files flag as a recurring bug: the presigned
// `url` has no trailing slash, so concatenating produces `<endpoint><uuid>` —
// a malformed link that 404s. The key alone is what the proxy resolves, and
// what the physical-check endpoint stores.
//
// The bucket POST must not carry our Authorization header: it is a third party,
// the header would be rejected, and sending a credential to somebody else's
// host is worth avoiding on its own. `fetch` here rather than the app's axios
// instance, which attaches the token to every request.
async function uploadInspectionPhoto(file) {
  const { data } = await coreApi().get('/image/url', { params: { folder: 'vehicle' } })
  const form = new FormData()
  Object.entries(data.fields).forEach(([k, v]) => form.append(k, v))
  form.append('acl', 'public-read')
  form.append('file', file)
  const res = await fetch(data.url, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Upload failed (${res.status})`)
  return data.fields.key
}

export default function PhysicalCheck({ item, row, vehicleId, canEdit, onChanged }) {
  const status = row?.[`${item.key}Status`] || 'pending'
  const reason = row?.[`${item.key}Reason`] || null
  const urls = row?.[`${item.key}ImageUrls`] || []
  const keys = row?.[`${item.key}Images`] || []

  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState([]) // {key, preview} not yet saved
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef(null)

  const evidenceCount = keys.length + pending.length
  const blockedForEvidence = item.evidence && evidenceCount === 0

  const pick = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = '' // re-picking the same file must still fire onChange
    if (!files.length) return
    setBusy(true)
    try {
      const added = []
      for (const file of files) {
        const key = await uploadInspectionPhoto(file)
        added.push({ key, preview: URL.createObjectURL(file) })
      }
      setPending((p) => [...p, ...added])
    } catch (err) {
      ErrorToast(err.message || 'Could not upload that photo')
    } finally {
      setBusy(false)
    }
  }

  // Every save sends the FULL list — already-saved keys plus anything staged.
  // The endpoint treats an omitted `images` as "keep what is there" and an
  // explicit array as the new set, so sending only the new ones would drop the
  // existing photographs.
  const save = async (nextStatus) => {
    let text = null
    if (nextStatus === 'rejected') {
      text = window.prompt(`Why is the ${item.label.toLowerCase()} check being rejected?`)
      if (!text || !text.trim()) return // cancelled, or empty — the API refuses it anyway
    }
    setBusy(true)
    try {
      await coreApi().post(`/admin/vehicle/${vehicleId}/physical-check`, {
        item: item.key,
        status: nextStatus,
        reason: text,
        images: [...keys, ...pending.map((p) => p.key)],
      })
      setPending([])
      onChanged?.()
    } catch (err) {
      ErrorToast(err?.platform?.message || `Could not update the ${item.label} check`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className='border border-gray-200 rounded-lg p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-sm'>{item.label}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${DOC_PILL[status]}`}>{DOC_LABEL[status]}</span>
          </div>
          <p className='text-xs text-gray-500 mt-1'>{item.hint}</p>
          {reason && <p className='text-xs text-red-600 mt-1'>Rejected: {reason}</p>}
        </div>
      </div>

      {(urls.length > 0 || pending.length > 0) && (
        <div className='flex flex-wrap gap-2 mt-3'>
          {urls.map((u, i) => (
            <button key={`saved-${i}`} type='button' onClick={() => setLightbox(photoUrl(u))}
              className='w-20 h-20 rounded overflow-hidden border border-gray-200'>
              <img src={photoUrl(u)} alt={`${item.label} ${i + 1}`} className='w-full h-full object-cover' />
            </button>
          ))}
          {pending.map((p, i) => (
            <div key={`new-${i}`} className='w-20 h-20 rounded overflow-hidden border-2 border-amber-400 relative'>
              <img src={p.preview} alt='' className='w-full h-full object-cover' />
              <span className='absolute bottom-0 inset-x-0 bg-amber-400 text-[10px] text-center'>unsaved</span>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <>
          <input ref={fileRef} type='file' accept='image/*' multiple hidden onChange={pick} />
          <div className='flex flex-wrap items-center gap-2 mt-3'>
            <button type='button' disabled={busy} onClick={() => fileRef.current?.click()}
              className='text-xs px-3 py-1.5 rounded border border-gray-300 disabled:opacity-50'>
              {busy ? 'Working…' : 'Add photo'}
            </button>
            <button type='button' disabled={busy || status === 'verified' || blockedForEvidence}
              onClick={() => save('verified')}
              className='text-xs px-3 py-1.5 rounded bg-green-600 text-white disabled:opacity-40'>
              Verify
            </button>
            <button type='button' disabled={busy || status === 'rejected'} onClick={() => save('rejected')}
              className='text-xs px-3 py-1.5 rounded border border-red-300 text-red-600 disabled:opacity-40'>
              Reject
            </button>
            {/* Say WHY Verify is unavailable. The backend refuses this case, and
                a disabled button with no explanation reads as a broken screen. */}
            {blockedForEvidence && (
              <span className='text-xs text-amber-700'>Add a photo of the vehicle before verifying.</span>
            )}
            {pending.length > 0 && (
              <span className='text-xs text-gray-500'>
                {pending.length} photo{pending.length > 1 ? 's' : ''} will be saved with your next decision.
              </span>
            )}
          </div>
        </>
      )}

      {lightbox && (
        <div className='fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6'
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt='' className='max-w-full max-h-full object-contain' />
        </div>
      )}
    </div>
  )
}
