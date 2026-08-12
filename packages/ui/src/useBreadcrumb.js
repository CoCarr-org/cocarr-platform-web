'use client'
import { usePathname } from 'next/navigation'
import { useRouteContext } from '@cocarr/iam-sdk'

// The breadcrumb comes from the SAME nav payload the sidebar is built from —
// portal / module / sub-module, resolved by route — not from splitting the URL.
//
// A path-derived crumb reads "Users / 7f3a… / Payment" and invents labels the
// menu never used; this one cannot drift from the menu, because it IS the
// menu's data. It also means a screen renamed in
// cocarr-authorization-service is renamed in its breadcrumb with no deploy.
//
// It returns [] while the nav is still loading and [] for a route the nav has
// never heard of — every `[id]` detail page is one of those, and a
// half-guessed trail is worse than none. Detail screens carry their own
// explicit back-link instead.
//
// No try/catch and no conditional call: NavigationContext has a real default
// (`emptyNavigation()`), so this is safe with no provider above it and the
// hook order is unconditional.
export default function useBreadcrumb(explicitParent) {
  const pathname = usePathname()
  const ctx = useRouteContext(pathname)
  if (explicitParent) return [explicitParent]
  if (!ctx) return []
  return [ctx.portal?.label, ctx.module?.label, ctx.subModule?.label].filter(Boolean)
}
