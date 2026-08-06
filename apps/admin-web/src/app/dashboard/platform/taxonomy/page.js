'use client'
import React, { useEffect, useState } from 'react'
import { platformApi } from '@cocarr/api-sdk'
import { ErrorToast } from '@cocarr/notifications'
import { Header } from '@cocarr/ui'

// The IAM taxonomy — Product > Portal > Module > SubModule — as a browser.
//
// READ-ONLY, and that is the point. `src/seeds/taxonomy.js` in
// cocarr-authorization-service is GENERATED from cocarr-platform-web's real
// navConfig, precisely so the IAM tree and the sidebar people actually use
// cannot drift apart. Hand-editing a node here would put the database and the
// generator out of step, and the next `generateTaxonomy.js` run would either
// revert the edit or silently keep both. The way to change this tree is to
// change the nav and re-run the generator.
//
// It is still worth a screen: this is the map of every module and screen the
// platform has, and "does IAM know about this route?" is the first question
// behind every missing-menu-entry report.

const PAGE = 500 // one read per level; the whole tree is ~100 rows

const Chevron = ({ open }) => (
  <span className={`inline-block transition-transform text-[#959595] ${open ? 'rotate-90' : ''}`}>›</span>
)

function Node({ label, sub, route, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const hasChildren = React.Children.count(children) > 0
  return (
    <div>
      <button
        type='button'
        onClick={() => hasChildren && setOpen((o) => !o)}
        className={`w-full text-left flex items-baseline gap-2 px-3 py-2 rounded-md ${hasChildren ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
      >
        <span className='w-3 shrink-0'>{hasChildren ? <Chevron open={open} /> : null}</span>
        <span className='font-semibold text-sm'>{label}</span>
        {sub && <span className='text-[11px] text-[#959595]'>{sub}</span>}
        {route && <code className='text-[11px] text-[#757575] ml-auto shrink-0'>{route}</code>}
        {count !== undefined && (
          <span className='text-[11px] text-[#959595] ml-2 shrink-0'>{count}</span>
        )}
      </button>
      {open && <div className='ml-5 border-l border-gray-100 pl-2'>{children}</div>}
    </div>
  )
}

export default function Taxonomy() {
  const [tree, setTree] = useState(null)
  const [loading, setLoading] = useState(true)
  const [totals, setTotals] = useState(null)

  useEffect(() => {
    (async () => {
      try {
        const api = platformApi()
        // Four flat reads assembled in JS, matching how navigationService builds
        // its tree — a four-level eager load is exactly where one missing
        // association takes out the whole response.
        const [products, portals, modules, subModules, permissions] = await Promise.all([
          api.get(`/products?limit=${PAGE}`),
          api.get(`/portals?limit=${PAGE}`),
          api.get(`/modules?limit=${PAGE}`),
          api.get(`/sub-modules?limit=${PAGE}`),
          api.get(`/permissions?limit=${PAGE * 4}`),
        ])
        const rows = (r) => r.data?.data || []
        const P = rows(products); const PO = rows(portals)
        const M = rows(modules); const SM = rows(subModules); const PERM = rows(permissions)

        const bySort = (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.name).localeCompare(String(b.name))
        const permCount = PERM.reduce((acc, p) => {
          acc[p.moduleId] = (acc[p.moduleId] || 0) + 1
          return acc
        }, {})

        setTree(
          P.slice().sort(bySort).map((prod) => ({
            ...prod,
            portals: PO.filter((x) => x.productId === prod.id).sort(bySort).map((po) => ({
              ...po,
              modules: M.filter((x) => x.portalId === po.id).sort(bySort).map((m) => ({
                ...m,
                permissions: permCount[m.id] || 0,
                subModules: SM.filter((x) => x.moduleId === m.id).sort(bySort),
              })),
            })),
          })),
        )
        setTotals({
          products: P.length, portals: PO.length, modules: M.length,
          subModules: SM.length, permissions: PERM.length,
        })
      } catch (error) {
        ErrorToast(error?.response?.data?.error?.message || 'Could not load the taxonomy')
      } finally { setLoading(false) }
    })()
  }, [])

  return (
    <div className='max-w-5xl mx-auto pb-10'>
      <Header title='IAM Taxonomy' RightContent={() => null} />

      <p className='text-sm text-[#757575] my-4 px-1'>
        Every product, portal, module and screen IAM knows about. This is the tree the sidebar is
        rendered from, so if a screen is missing from someone&apos;s menu, the first question is
        whether it appears here at all.
      </p>

      <div className='bg-gray-50 border border-gray-200 text-[#454545] text-xs rounded-md px-4 py-3 mx-1 mb-4'>
        <strong>Read-only, deliberately.</strong> This tree is generated from the web
        app&apos;s real navigation by <code className='text-[11px]'>scripts/generateTaxonomy.js</code>,
        so the menu and the permission model cannot drift apart. Editing a node here would put the
        database out of step with the generator. To add a screen, add it to the nav, re-run the
        generator and re-seed.
      </div>

      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}

      {!loading && totals && (
        <p className='text-[11px] text-[#959595] px-1 mb-3'>
          {totals.products} products · {totals.portals} portals · {totals.modules} modules ·{' '}
          {totals.subModules} screens · {totals.permissions} permissions
        </p>
      )}

      {!loading && tree && (
        <div className='bg-white border border-gray-100 rounded-md py-2'>
          {tree.map((prod) => (
            <Node key={prod.id} label={prod.name} sub={prod.key} defaultOpen>
              {prod.portals.map((po) => (
                <Node key={po.id} label={po.name} sub={po.key}>
                  {po.modules.map((m) => (
                    <Node
                      key={m.id}
                      label={m.name}
                      sub={m.key}
                      route={m.route}
                      count={`${m.permissions} perms`}
                    >
                      {m.subModules.map((sm) => (
                        <div key={sm.id} className='flex items-baseline gap-2 px-3 py-1.5'>
                          <span className='w-3 shrink-0' />
                          <span className='text-sm text-[#454545]'>{sm.name}</span>
                          <code className='text-[11px] text-[#757575] ml-auto'>{sm.route}</code>
                        </div>
                      ))}
                    </Node>
                  ))}
                </Node>
              ))}
            </Node>
          ))}
        </div>
      )}

      {!loading && tree && tree.length === 0 && (
        <p className='px-1 py-4 text-sm text-[#757575]'>
          The taxonomy is empty. Run <code className='text-[11px]'>node scripts/seedTaxonomy.js --confirm</code> in
          cocarr-authorization-service.
        </p>
      )}
    </div>
  )
}
