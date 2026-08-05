'use client'
import { useSelector } from 'react-redux'
import { useMemo } from 'react'
import { NAV_MODULES } from './navConfig'
import { panelHasModule } from './panels'

// Everything the panel knows about "what may this person do?".
//
// The grid comes from `GET /admin/me`, which is itself one call to the
// backend's `resolveAccess` — the same function `requirePermission` enforces
// with. That shared origin is the point: a second implementation of the rules
// here would drift, and the drift is invisible in both directions. Hide
// something the server allows and the panel looks broken; show something it
// denies and every click is a 403.
//
// So this file NEVER decides anything. It reads the grid and answers questions
// about it.

const NO_ACTIONS = { create: false, read: false, update: false, delete: false }

// `enforced: false` means the server is in RBAC dry-run — it allows everything
// and only logs. The panel mirrors that rather than gating anyway, because a UI
// that hides what the server permits would make dry-run useless for the one
// thing it exists for: debugging a lockout without a deploy. The banner in the
// shell is what stops anyone mistaking a dry-run panel for a live one.
export function usePermissions() {
  const auth = useSelector((s) => s.auth)

  return useMemo(() => {
    const permissions = auth?.permissions || null
    const enforced = auth?.enforced !== false
    // The profile hasn't arrived yet. Treated as "nothing yet" rather than
    // "nothing at all" — callers use `ready` to render a skeleton instead of
    // briefly flashing an empty sidebar at someone who has full access.
    const ready = !!permissions

    const submodules = auth?.submodules || {}

    // `route` is the per-SCREEN override key. When one exists it WINS outright
    // rather than being intersected with the module grid — that is what lets a
    // Super Admin grant a single screen inside a module the team otherwise
    // cannot open. An intersection could only ever subtract.
    const actions = (module, route = null) => {
      if (!enforced) return { create: true, read: true, update: true, delete: true }
      if (!permissions) return NO_ACTIONS
      if (route && submodules[route]) {
        const o = submodules[route]
        return { create: !!o.create, read: !!o.read, update: !!o.update, delete: !!o.delete }
      }
      return permissions[module] || NO_ACTIONS
    }

    return {
      ready,
      enforced,
      team: auth?.team || null,
      level: auth?.level || null,
      source: auth?.source || null,
      permissions,
      submodules,
      actions,
      can: (module, action = 'read', route = null) => !!actions(module, route)[action],
      canRead: (module, route = null) => !!actions(module, route).read,
    }
  }, [auth])
}

// The nav this admin should see: every page whose module they can read, with a
// group kept only if at least one of its pages survived.
//
// GATING IS PER PAGE, not per group. navConfig already overrides the module on
// individual pages — Finance holds Wallets (`users`), Taxes (`settings`) and
// Host Bank Accounts (`payouts`) alongside its own `payments` pages — so judging
// a group by its own module alone would both hide pages someone can legitimately
// open and show groups containing nothing they can.
export function useVisibleNav() {
  const { ready, canRead } = usePermissions()

  return useMemo(() => {
    // Before the profile lands, show nothing rather than everything. The shell
    // renders a skeleton on `ready`, so this is never visible as an empty menu —
    // and showing the full nav first would flash pages at people who cannot open
    // them, which is worse than a moment of blankness.
    if (!ready) return []

    return NAV_MODULES
      .map((m) => ({
        ...m,
        // Both gates, in order: does this PANEL ship the module at all, and may
        // this PERSON read it. The panel check is a no-op today (both panels
        // ship '*') and is here so a per-team split later is a manifest edit
        // rather than a change to this file.
        pages: m.pages.filter((p) => {
          // Not named `module` — Next forbids assigning that identifier.
          const key = p.module || m.module
          // The route is passed so a per-screen override decides this page,
          // falling back to the module when there is none. Without it, a
          // screen granted individually would still be hidden by its module.
          return panelHasModule(key) && canRead(key, p.route)
        }),
      }))
      .filter((m) => m.pages.length > 0)
  }, [ready, canRead])
}

// Can this admin open this exact route? Used by the router to tell "you may not
// see this" apart from "no such page" — two different messages, and conflating
// them tells someone their permissions are broken when they have simply
// mistyped a URL.
export function useCanOpenRoute() {
  const { ready, canRead } = usePermissions()
  return useMemo(() => (route) => {
    if (!ready) return null // unknown yet
    const clean = (route || '').replace(/\/$/, '') || '/dashboard'
    for (const m of NAV_MODULES) {
      for (const p of m.pages) {
        if (p.route === clean) {
          const key = p.module || m.module
          // The PANEL gate belongs here too, not just in the nav. Hiding a menu
          // entry does not make a page unreachable: the catch-all router
          // statically imports every page component and maps every route, so on
          // admin.cocarr.com a typed URL would still open Admin Accounts for
          // anyone whose grid allows it — including a super admin, who is
          // allowed on this panel by the top-down rule.
          //
          // Root-only screens must be unreachable on a lower panel regardless
          // of who is asking. Root admins open them at root.cocarr.com.
          if (!panelHasModule(key)) return false
          return canRead(key, p.route)
        }
      }
    }
    // Not a nav route — dynamic pages (`/dashboard/users/[id]`) and the handful
    // of static routes outside navConfig. Judged by their parent section in the
    // router, which knows the mapping; unknown here means "don't block".
    return null
  }, [ready, canRead])
}
