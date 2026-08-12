'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { photoUrl } from '@cocarr/shared-utils'

// Ops-local composition layer over @cocarr/ui.
//
// WHY HERE AND NOT IN @cocarr/ui. These are compositions of the design system
// for one shape of screen — an operations list or an operations detail page —
// not new primitives. @cocarr/ui is shared by admin and workspace, and a
// component those two never render is a component they still have to build,
// version and reason about. PageLayout, Pagination and DataTable stay there;
// "a review queue card" belongs here.
//
// The rule these enforce is that a list screen has FOUR states and the old
// screens only drew one. Loading, error, empty and populated look completely
// different to somebody working a queue, and rendering an empty table for the
// first three is what made "the request failed" and "there is nothing to do"
// indistinguishable.

// ── Pills ───────────────────────────────────────────────────────────────────
// Tone, not colour, is the prop: a caller says what the value MEANS and the map
// decides how that looks. Passing Tailwind classes in from the call site is how
// the same state ends up amber on one screen and grey on the next.
const TONES = {
  neutral: 'bg-gray-100 text-gray-600',
  good: 'bg-green-100 text-green-700',
  warn: 'bg-amber-100 text-amber-700',
  bad: 'bg-red-100 text-red-600',
  info: 'bg-blue-100 text-blue-700',
  brand: 'bg-[#fdf6e0] text-[#8a6d00]',
}

export function Pill({ tone = 'neutral', className = '', children }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap text-[11px] font-semibold px-2 py-0.5 rounded-full ${TONES[tone] || TONES.neutral} ${className}`}>
      {children}
    </span>
  )
}

// A pill whose tone is driven by a lookup map — the pattern every status
// vocabulary file (vehicleStatus.js, userStatus.js) already provides.
export function StatusPill({ status, labels, pills, fallback = 'Unknown' }) {
  const cls = pills?.[status] || TONES.neutral
  return (
    <span className={`inline-flex items-center whitespace-nowrap text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {labels?.[status] || fallback}
    </span>
  )
}

// ── Layout blocks ───────────────────────────────────────────────────────────
export function SectionCard({ title, description, actions, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`bg-white border border-gray-100 rounded-lg mb-4 ${className}`}>
      {(title || actions) && (
        <header className='flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-gray-50'>
          <div className='min-w-0'>
            <h2 className='text-[13px] font-semibold text-[#1a1a1a]'>{title}</h2>
            {description && <p className='text-xs text-[#757575] mt-0.5'>{description}</p>}
          </div>
          {actions && <div className='flex items-center gap-2 shrink-0'>{actions}</div>}
        </header>
      )}
      <div className={`px-5 py-4 ${bodyClassName}`}>{children}</div>
    </section>
  )
}

export function FieldGrid({ cols = 4, children }) {
  const map = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 6: 'md:grid-cols-6' }
  return <div className={`grid grid-cols-2 ${map[cols] || map[4]} gap-x-4 gap-y-5`}>{children}</div>
}

// `value` renders '—' when empty rather than collapsing the row. A field that
// disappears when it has no value makes two records with different data look
// like two different screens.
export function Field({ label, value, hint, mono, capitalize = true }) {
  const empty = value === null || value === undefined || value === ''
  return (
    <div className='min-w-0'>
      <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>{label}</p>
      <p className={`text-sm text-[#454545] break-words ${mono ? 'font-mono text-xs' : 'font-medium'} ${capitalize && !mono ? 'capitalize' : ''} ${empty ? 'text-[#b5b5b5]' : ''}`}>
        {empty ? '—' : value}
      </p>
      {hint && <p className='text-[11px] text-[#959595] mt-0.5'>{hint}</p>}
    </div>
  )
}

// ── The four list states ────────────────────────────────────────────────────
export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className='bg-white border border-gray-100 rounded-lg p-10 text-center'>
      <div className='inline-block w-5 h-5 border-2 border-gray-200 border-t-[#ECC032] rounded-full animate-spin' />
      <p className='text-sm text-[#757575] mt-3'>{label}</p>
    </div>
  )
}

// ERROR IS NOT EMPTY. The old screens caught a failure, showed a toast that had
// already faded, and left a table saying nothing — so a 403 and a genuinely
// empty queue were the same screen. This one stays on the page and offers the
// retry, because the failure is usually transient and the alternative is a
// full reload that loses the filters.
export function ErrorState({ message, onRetry }) {
  return (
    <div className='bg-white border border-red-100 rounded-lg p-8 text-center'>
      <p className='text-sm font-medium text-red-600'>{message || 'Something went wrong.'}</p>
      {onRetry && (
        <button onClick={onRetry} className='btn-md mt-4'>Try again</button>
      )}
    </div>
  )
}

// The message says what WOULD put something here. "No results" tells somebody
// working a queue nothing; "new listings appear here as soon as a host submits
// one" tells them whether to wait or to go looking for a bug.
export function EmptyState({ title, message, action }) {
  return (
    <div className='bg-white border border-gray-100 rounded-lg p-10 text-center'>
      <p className='text-sm font-medium text-[#454545]'>{title}</p>
      {message && <p className='text-xs text-[#757575] mt-1 max-w-md mx-auto'>{message}</p>}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  )
}

// One wrapper so no screen has to re-decide the order of these checks. Empty
// is only reachable once loading has finished AND no error is in play —
// getting that order wrong is how "failed to load" renders as "nothing here".
export function ListState({ loading, error, onRetry, isEmpty, empty, children }) {
  if (loading) return <LoadingBlock />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (isEmpty) return empty
  return children
}

// ── Controls ────────────────────────────────────────────────────────────────
const CONTROL = 'border border-gray-200 rounded-md px-3 py-2 text-sm bg-white outline-none focus:border-[#ECC032] focus:ring-0'

export function SearchBox({ value, onChange, placeholder = 'Search', className = '' }) {
  return (
    <input
      type='search'
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${CONTROL} flex-1 min-w-[220px] max-w-sm ${className}`}
    />
  )
}

export function FilterSelect({ value, onChange, options, className = '' }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`${CONTROL} w-auto ${className}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// Chips carry their own counts. A filter you can only evaluate by selecting it
// costs a round trip per guess; the count is what makes the row scannable.
export function FilterChips({ value, onChange, options }) {
  return (
    <div className='flex items-center gap-1.5 flex-wrap'>
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type='button'
            onClick={() => onChange(o.value)}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-md border transition-colors ${
              active
                ? 'border-[#ECC032] bg-[#fdf6e0] text-[#151515]'
                : 'border-gray-200 bg-white text-[#757575] hover:border-gray-300'
            }`}
          >
            {o.label}
            {typeof o.count === 'number' && (
              <span className={`ml-1.5 ${active ? 'text-[#8a6d00]' : 'text-[#b5b5b5]'}`}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// Search must not fire a request per keystroke — the lists are paginated
// server-side and every character was its own round trip.
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Media ───────────────────────────────────────────────────────────────────
// Every DB-sourced image goes through photoUrl(): the bucket is private and a
// raw link 403s. Initials rather than a grey circle, so a list of hosts is
// still scannable when nobody has uploaded a photo.
export function Avatar({ src, name, size = 40, rounded = 'rounded-full' }) {
  const initials = useMemo(() => (
    String(name || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?'
  ), [name])

  const style = { width: size, height: size }
  if (!src) {
    return (
      <div style={style} className={`${rounded} bg-[#f0efe9] text-[#8a6d00] flex items-center justify-center shrink-0`}>
        <span className='text-[11px] font-bold'>{initials}</span>
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoUrl(src)} alt={name || ''} style={style} className={`${rounded} object-cover bg-gray-100 shrink-0`} />
  )
}

export function Thumb({ src, alt, className = 'w-14 h-10' }) {
  if (!src) {
    return <div className={`${className} rounded bg-gray-100 shrink-0`} aria-hidden />
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoUrl(src)} alt={alt || ''} className={`${className} rounded object-cover bg-gray-100 shrink-0`} />
  )
}

// ── Detail-page header ──────────────────────────────────────────────────────
// The identity of the record, its status, and what you can do to it — above the
// tab bar, so it does not change as you move between tabs. The old detail
// layouts put a bare name here and left the reviewer to work out from the body
// which record they had open.
export function DetailHeader({ media, title, subtitle, meta = [], pills = [], actions, backHref, backLabel }) {
  return (
    <div className='pt-5 pb-4'>
      {backHref && (
        <Link href={backHref} className='text-[11px] text-[#959595] hover:text-[#454545]'>
          ← {backLabel || 'Back'}
        </Link>
      )}
      <div className='flex items-start justify-between gap-4 flex-wrap mt-1.5'>
        <div className='flex items-start gap-3 min-w-0'>
          {media}
          <div className='min-w-0'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h1 className='text-xl font-bold text-[#1a1a1a] leading-tight truncate'>{title || '—'}</h1>
              {pills}
            </div>
            {subtitle && <p className='text-sm text-[#757575] mt-0.5'>{subtitle}</p>}
            {meta.length > 0 && (
              <div className='flex items-center gap-x-4 gap-y-1 flex-wrap mt-1.5'>
                {meta.filter(Boolean).map((m, i) => (
                  <span key={i} className='text-[11px] text-[#959595]'>
                    <span className='text-[#b5b5b5]'>{m.label}</span> {m.value || '—'}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {actions && <div className='flex items-center gap-2 shrink-0'>{actions}</div>}
      </div>
    </div>
  )
}

// ── Small text bits ─────────────────────────────────────────────────────────
export function Stat({ label, value, hint }) {
  return (
    <div className='px-4 py-3 border border-gray-100 rounded-lg bg-white'>
      <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold'>{label}</p>
      <p className='text-lg font-bold text-[#1a1a1a] leading-tight mt-0.5'>
        {value === null || value === undefined || value === '' ? '—' : value}
      </p>
      {hint && <p className='text-[11px] text-[#959595] mt-0.5'>{hint}</p>}
    </div>
  )
}

export function StatRow({ children, cols = 4 }) {
  const map = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' }
  return <div className={`grid grid-cols-2 ${map[cols] || map[4]} gap-3 mb-4`}>{children}</div>
}

// A note that explains a rule of the system rather than reporting an event.
// Used where a screen would otherwise imply something untrue — e.g. that
// approving a vehicle makes it bookable.
export function Explainer({ children, tone = 'neutral' }) {
  const map = {
    neutral: 'bg-[#fafafa] border-gray-100 text-[#757575]',
    warn: 'bg-amber-50 border-amber-100 text-amber-800',
    info: 'bg-blue-50 border-blue-100 text-blue-800',
  }
  return (
    <div className={`border rounded-md px-3 py-2 text-[11px] leading-relaxed ${map[tone]}`}>{children}</div>
  )
}
