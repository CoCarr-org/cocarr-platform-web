'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import authAxios from '@/app/_helpers/axios'
import { usePermissions } from '@/app/_helpers/permissions'
import { PANEL } from '@/app/_helpers/panels'

// The dashboard — one page, composed for the signed-in admin's team, with the
// content decided by their level.
//
// ── It renders what the server sends, and nothing else ──
// `GET /admin/dashboard/summary` returns only the blocks this admin may see:
// each is gated on its own module AND action, so an Operations Agent
// (read-only) receives the bookings queue while a Manager on the same team also
// receives the approval and dispute blocks. This file filters nothing. A second
// copy of the permission rules here would drift from the server's, silently.
//
// That is also why no per-team layout lives in this file. The composition is in
// `dashboardSummaryService` because teams and levels are edited at runtime by a
// Super Admin — a layout baked into the client would go stale the moment
// somebody changed the grid.
//
// The previous charts dashboard is kept at `_components/PlatformOverview.jsx`.
// It is platform-wide and not team-scoped, so it cannot simply be rendered
// here; see the note at the top of that file.

const greeting = () => {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Module scope, deliberately ──────────────────────────────────────────────
// A component defined inside another's render is a new type every render, so
// React remounts it — here that would restart the fetch on every state change.

// A single figure. Always a link where there is somewhere to go: the point of a
// dashboard number is to be the fastest route into the list behind it, and a
// count you cannot click is a dead end.
const Figure = ({ label, value, href, onGo, strong }) => (
  <button
    type='button'
    onClick={() => href && onGo(href)}
    disabled={!href}
    className={`text-left ${href ? 'cursor-pointer group' : 'cursor-default'}`}
  >
    <p className={`${strong ? 'text-2xl' : 'text-lg'} font-semibold text-[#252525] ${href ? 'group-hover:text-[#ECC032]' : ''}`}>
      {value}
    </p>
    <p className='text-[11px] text-[#757575]'>{label}</p>
  </button>
)

const BlockCard = ({ block, onGo }) => {
  if (block.error) {
    return (
      <div className='bg-white border border-gray-100 rounded-md p-5'>
        <p className='font-semibold text-sm mb-1'>{block.label}</p>
        {/* Reported rather than hidden. A tile that quietly vanishes reads as
            "you don't have access to this" — a different and more alarming
            message than "this count failed". */}
        <p className='text-xs text-[#959595]'>Couldn&apos;t load this right now.</p>
      </div>
    )
  }

  return (
    <div className='bg-white border border-gray-100 rounded-md p-5'>
      <p className='font-semibold text-sm mb-3'>{block.label}</p>
      <div className='flex flex-wrap items-end gap-6'>
        {block.primary && <Figure {...block.primary} onGo={onGo} strong />}
        {(block.secondary || []).map((f) => <Figure key={f.label} {...f} onGo={onGo} />)}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { team, level, source, ready } = usePermissions()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await authAxios.get('/admin/dashboard/summary')
        if (!cancelled) { setData(res.data); setError('') }
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || 'Could not load the dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const go = (href) => router.push(href)

  const blocks = data?.blocks || []
  const attention = data?.attention || []
  const teamName = data?.team?.name || team?.name

  return (
    <div className='max-w-7xl mx-auto px-6 py-6'>
      <div className='mb-6 flex items-start justify-between gap-4 flex-wrap'>
        <div>
          <h1 className='text-xl font-semibold text-[#252525]'>
            {teamName ? `${teamName} ${PANEL.label}` : PANEL.label}
          </h1>
          <p className='text-sm text-[#757575] mt-0.5'>
            {greeting()}
            {attention.length > 0
              ? ". Here's what needs you today."
              : '. Nothing is waiting on you right now.'}
          </p>
        </div>
        {level && (
          <p className='text-xs text-[#959595] mt-1'>
            Signed in as <span className='font-semibold text-[#757575]'>{level.name}</span>
          </p>
        )}
      </div>

      {/* Not on a team — the backend is judging them by the legacy role matrix.
          A setup gap, not a decision about them, so it says who fixes it. */}
      {ready && source === 'legacy' && (
        <div className='bg-amber-50 border-l-2 border-amber-400 rounded-md px-4 py-3 mb-5'>
          <p className='text-xs text-amber-800'>
            You aren&apos;t on a team yet, so this dashboard is empty. Ask a Super Admin to
            assign you one.
          </p>
        </div>
      )}

      {/* The attention strip is ONLY things a human must act on; interesting
          numbers live on the cards. When there is nothing it says so in a line
          rather than disappearing — an absent strip reads as a loading bug. */}
      {!loading && !error && (
        attention.length > 0 ? (
          <div className='bg-white border-l-2 border-[#ECC032] rounded-md px-4 py-3 mb-5'>
            <div className='flex flex-wrap items-center gap-x-6 gap-y-1'>
              {attention.map((a) => (
                <button
                  key={a.key}
                  onClick={() => a.href && go(a.href)}
                  className='text-xs font-semibold text-[#454545] hover:text-[#ECC032]'
                >
                  {a.message}
                </button>
              ))}
            </div>
          </div>
        ) : blocks.length > 0 ? (
          <p className='text-xs text-[#959595] mb-5'>Nothing needs your attention.</p>
        ) : null
      )}

      {loading && <p className='text-sm text-[#757575]'>Loading…</p>}

      {error && !loading && (
        <div className='bg-white border border-gray-100 rounded-md p-6'>
          <p className='text-sm text-[#757575]'>{error}</p>
        </div>
      )}

      {!loading && !error && blocks.length === 0 && source !== 'legacy' && (
        // A genuinely empty dashboard is a real state, not a failure: a team
        // with one read permission gets one card, and a team with none gets
        // this. Saying so plainly beats an empty grid that looks broken.
        <div className='bg-white border border-gray-100 rounded-md p-8 text-center'>
          <p className='text-sm text-[#454545] font-semibold mb-1'>Nothing to show here yet</p>
          <p className='text-xs text-[#959595]'>
            {teamName
              ? `The ${teamName} team doesn't have access to any dashboard areas.`
              : 'Your account has no dashboard areas.'}
            {' '}Use the sidebar, or ask a Super Admin to widen your access.
          </p>
        </div>
      )}

      {!loading && !error && blocks.length > 0 && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {blocks.map((b) => <BlockCard key={b.key} block={b} onGo={go} />)}
        </div>
      )}
    </div>
  )
}
