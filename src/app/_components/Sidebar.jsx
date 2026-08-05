'use client'
import React, { useEffect, useMemo, useState } from 'react'
import Logo from '@/../public/logo.png'
import {
  IoAppsOutline, IoDocumentsOutline, IoCashOutline, IoPeopleOutline,
  IoSettingsOutline, IoCarOutline, IoSearchOutline, IoStar, IoStarOutline,
} from 'react-icons/io5'
import { useDispatch } from 'react-redux'
import { logout } from '@/store/slice/authSlice'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { BiLogOutCircle } from 'react-icons/bi'
import { usePermissions, useVisibleNav } from '@/app/_helpers/permissions'
import { PANEL, teamIcon } from '@/app/_helpers/panels'

const ICONS = {
  apps: IoAppsOutline, people: IoPeopleOutline, car: IoCarOutline,
  cash: IoCashOutline, docs: IoDocumentsOutline, settings: IoSettingsOutline,
}

const FAVOURITES_KEY = 'cocarr.admin.favourites'

// Driven entirely by navConfig.js so the sidebar and the router can never
// disagree about which pages exist.
export default function Sidebar() {
  const pathname = usePathname()
  const navigate = useRouter()
  const dispatch = useDispatch()
  const [openModule, setOpenModule] = useState(null)
  const [search, setSearch] = useState('')
  const [favourites, setFavourites] = useState([])
  // What this admin may see. `visibleNav` is already filtered by team + level,
  // so every list below derives from it rather than from NAV_MODULES — using
  // the full config anywhere here would leak pages back in through search or
  // pinning, which is exactly the sort of gap that survives a review.
  const visibleNav = useVisibleNav()
  const { ready, team, level, source, enforced } = usePermissions()

  // Favourites/pinning per the spec — a per-browser preference, so
  // localStorage rather than a backend table.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVOURITES_KEY)
      if (raw) setFavourites(JSON.parse(raw))
    } catch { /* ignore malformed storage */ }
  }, [])

  const toggleFavourite = (route) => {
    setFavourites((prev) => {
      const next = prev.includes(route) ? prev.filter((r) => r !== route) : [...prev, route]
      try { localStorage.setItem(FAVOURITES_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  // Auto-open the module owning the current route. Keyed on pathname only, so
  // a manual collapse isn't immediately undone on re-render. Searches the
  // VISIBLE nav — opening a group this admin cannot see would be a no-op that
  // silently swallows the open state for the group they can.
  useEffect(() => {
    const owning = visibleNav.find((m) => m.pages.some((p) => pathname === p.route || pathname === `${p.route}/`))
    if (owning) setOpenModule((prev) => (prev === owning.key ? prev : owning.key))
  }, [pathname, visibleNav])

  const filtered = useMemo(() => {
    if (!search.trim()) return visibleNav
    const q = search.toLowerCase()
    return visibleNav
      .map((m) => ({ ...m, pages: m.pages.filter((p) => p.label.toLowerCase().includes(q) || m.label.toLowerCase().includes(q)) }))
      .filter((m) => m.pages.length > 0)
  }, [search, visibleNav])

  // Pinned pages are resolved against the VISIBLE nav, so a page pinned before
  // someone's permissions changed quietly disappears instead of becoming a
  // shortcut into a 403. Pins live in localStorage and outlive permissions.
  const favouritePages = useMemo(() => {
    const all = visibleNav.flatMap((m) => m.pages.map((p) => ({ ...p, moduleLabel: m.label })))
    return favourites.map((r) => all.find((p) => p.route === r)).filter(Boolean)
  }, [favourites, visibleNav])

  const isActive = (route) => pathname === route || pathname === `${route}/`

  const PageLink = ({ page, showModule }) => (
    <div className='flex items-center group/page'>
      <Link
        href={`${page.route}/`}
        onClick={(e) => { e.preventDefault(); navigate.push(`${page.route}/`) }}
        className={`flex items-center flex-1 min-w-0 py-1.5 px-2 rounded-[6px] text-[13px] transition-colors ${
          isActive(page.route) ? 'bg-[#353535] text-[#fff] font-medium' : 'text-[#a3a3a3] hover:text-[#fff] hover:bg-[#1c1c1c]'
        }`}
      >
        <span className={`w-1.5 h-1.5 mr-2.5 rounded-full shrink-0 ${isActive(page.route) ? 'bg-[#ECC032]' : 'bg-[#4a4a4a]'}`} />
        <span className='truncate'>{page.label}</span>
        {showModule && <span className='ml-1 text-[10px] text-[#5a5a5a] shrink-0'>{page.moduleLabel}</span>}
      </Link>
      <button
        type='button'
        onClick={() => toggleFavourite(page.route)}
        title={favourites.includes(page.route) ? 'Unpin' : 'Pin to top'}
        className='px-1 opacity-0 group-hover/page:opacity-100 transition-opacity'
      >
        {favourites.includes(page.route)
          ? <IoStar className='w-3 h-3 text-[#ECC032]' />
          : <IoStarOutline className='w-3 h-3 text-[#757575] hover:text-[#ECC032]' />}
      </button>
    </div>
  )

  return (
    <div className='w-[280px] h-screen flex items-stretch shrink-0'>
      <div className='flex flex-col h-full bg-[#151515] w-[280px]'>
        <div className='shrink-0 px-6 pt-6 pb-3'>
          <img alt='logo' src={Logo.src} className='h-[46px] w-auto mb-3' />

          {/* Which portal am I in, and as whom. Two people screen-sharing should
              never have to ask. Renders as soon as the profile lands; before
              that it holds its height so the search box doesn't jump. */}
          <div className='mb-3 min-h-[42px]'>
            {ready && team ? (
              <div className='flex items-center gap-2'>
                <span className='w-7 h-7 rounded-[6px] bg-[#252525] grid place-items-center shrink-0'>
                  {(() => { const T = teamIcon(team.key); return <T className='w-4 h-4 text-[#ECC032]' /> })()}
                </span>
                <div className='min-w-0'>
                  <p className='text-[13px] text-[#e3e3e3] font-medium leading-tight truncate'>
                    {team.name} <span className='text-[#757575]'>{PANEL.label}</span>
                  </p>
                  {level && (
                    <p className='text-[11px] text-[#757575] leading-tight truncate'>{level.name}</p>
                  )}
                </div>
              </div>
            ) : ready && source === 'legacy' ? (
              // No team yet — the backend is still judging them by the old role
              // matrix. Say so plainly; it is a setup gap a Super Admin fixes.
              <p className='text-[11px] text-[#c2a13a] leading-snug'>
                You are not on a team yet. Ask a Super Admin to assign one.
              </p>
            ) : null}
          </div>

          {/* Dry-run: the server is allowing everything and only logging, so the
              panel is showing everything too. Nobody should mistake this for a
              live permission set. */}
          {ready && !enforced && (
            <p className='mb-3 text-[10px] text-[#c2a13a] bg-[#2a2410] border border-[#3a3418] rounded-[6px] px-2 py-1.5 leading-snug'>
              Permissions are in dry-run — everything is visible and the server is
              not enforcing.
            </p>
          )}

          <div className='relative'>
            <IoSearchOutline className='absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#757575]' />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search pages'
              className='w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-[6px] pl-8 pr-2 py-1.5 text-[12px] text-[#e3e3e3] placeholder:text-[#5a5a5a] focus:outline-none focus:border-[#3a3a3a]'
            />
          </div>
        </div>

        {/* flex-1 + min-h-0 so this actually scrolls inside the h-screen column */}
        <div className='flex-1 min-h-0 overflow-y-auto px-4 pb-4'>
          {favouritePages.length > 0 && !search && (
            <div className='mb-3'>
              <p className='text-[10px] uppercase tracking-wider text-[#5a5a5a] font-semibold px-2 mb-1'>Pinned</p>
              {favouritePages.map((p) => <PageLink key={`fav-${p.route}`} page={p} showModule />)}
            </div>
          )}

          {filtered.map((m) => {
            const Icon = ICONS[m.icon] || IoAppsOutline
            const open = search ? true : openModule === m.key
            const moduleActive = m.pages.some((p) => isActive(p.route))
            return (
              <div key={m.key} className='mb-0.5'>
                <button
                  type='button'
                  onClick={() => setOpenModule(open ? null : m.key)}
                  className={`flex items-center w-full px-2 py-2 rounded-[6px] transition-colors ${
                    moduleActive ? 'text-[#fff]' : 'text-[#d3d3d3] hover:bg-[#1c1c1c]'
                  }`}
                >
                  <Icon className='w-4 h-4 mr-3 shrink-0' />
                  <span className='text-[13px] font-medium flex-1 text-left'>{m.label}</span>
                  <span className='text-[10px] text-[#5a5a5a] mr-1'>{m.pages.length}</span>
                  {open ? <ChevronDown size={13} color='#757575' /> : <ChevronRight size={13} color='#757575' />}
                </button>
                {open && (
                  <div className='pl-4 pb-1'>
                    {m.pages.map((p) => <PageLink key={p.route} page={p} />)}
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <p className='text-[12px] text-[#5a5a5a] px-2 py-4'>No pages match &ldquo;{search}&rdquo;.</p>
          )}
        </div>

        <div className='shrink-0 px-4 py-3 border-t border-[#232323]'>
          <button
            type='button'
            onClick={() => { dispatch(logout()); navigate.push('/login/') }}
            className='flex items-center w-full px-2 py-2 rounded-[6px] text-[#757575] hover:text-[#fff] hover:bg-[#1c1c1c] transition-colors'
          >
            <BiLogOutCircle className='w-4 h-4 mr-3' />
            <span className='text-[13px] font-medium'>Logout</span>
          </button>
        </div>
      </div>
    </div>
  )
}
