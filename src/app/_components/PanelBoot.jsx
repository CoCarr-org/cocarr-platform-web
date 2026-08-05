'use client'
import Logo from '@/../public/logo.png'
import { PANEL } from '@/app/_helpers/panels'

// The screen shown between "signed in" and "we know what you may see".
//
// ── Why the panel must not render before the profile lands ──
// The sidebar, the router gate and every `can()` call read the permission grid
// from `GET /admin/me`. Until it arrives the grid is null, which the helpers
// correctly treat as "nothing" — so rendering the panel early shows a signed-in
// user an *empty sidebar and a No Access page* for a second, then snaps to the
// real thing. That reads as "my access was just revoked", which is alarming and
// completely wrong.
//
// Blocking on it is the honest alternative: an admin panel genuinely cannot be
// drawn until it knows who is looking at it.
//
// It names the panel, so on the day there is more than one host you can tell at
// a glance which you landed on — including while it is still loading, which is
// exactly when someone is most likely to wonder.
export default function PanelBoot({ state, message, onRetry, onSignOut }) {
  const failed = state === 'error' || state === 'blocked'

  return (
    <div className='h-screen w-full flex flex-col items-center justify-center bg-[#151515] px-6'>
      <img alt='Cocarr' src={Logo.src} className='h-[52px] w-auto mb-8' />

      {!failed && (
        <>
          {/* Deliberately not a spinner alone. A bare spinner says "wait"; this
              says what is being waited on, which is the difference between a
              slow load and an apparently hung one. */}
          <div className='w-48 h-0.5 bg-[#2a2a2a] rounded-full overflow-hidden mb-4'>
            <div className='h-full w-1/3 bg-[#ECC032] rounded-full animate-[boot_1.1s_ease-in-out_infinite]' />
          </div>
          <p className='text-[13px] text-[#a3a3a3]'>{message || 'Checking your access…'}</p>
          <p className='text-[11px] text-[#5a5a5a] mt-1'>Cocarr {PANEL.label}</p>
          <style jsx>{`
            @keyframes boot {
              0%   { transform: translateX(-100%); }
              100% { transform: translateX(300%); }
            }
          `}</style>
        </>
      )}

      {failed && (
        <div className='max-w-md text-center'>
          <p className='text-[15px] font-semibold text-[#e3e3e3] mb-2'>
            {state === 'blocked' ? "You don't have access to this panel" : "We couldn't check your access"}
          </p>
          <p className='text-[13px] text-[#a3a3a3] leading-relaxed mb-6'>
            {message}
          </p>
          <div className='flex items-center justify-center gap-3'>
            {/* A failed permission fetch is usually transient, so retry comes
                first. `blocked` is not — that one needs a different account or
                a Super Admin, so retrying would only look broken. */}
            {state === 'error' && onRetry && (
              <button onClick={onRetry}
                className='text-[13px] font-semibold bg-[#ECC032] text-black px-5 py-2 rounded-md'>
                Try again
              </button>
            )}
            {onSignOut && (
              <button onClick={onSignOut}
                className='text-[13px] font-semibold text-[#a3a3a3] hover:text-white px-4 py-2'>
                Sign out
              </button>
            )}
          </div>
          <p className='text-[11px] text-[#5a5a5a] mt-6'>Cocarr {PANEL.label}</p>
        </div>
      )}
    </div>
  )
}
