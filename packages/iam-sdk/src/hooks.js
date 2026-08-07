'use client';
import { useMemo } from 'react';
import { useNavigationContext } from './NavigationProvider';
import {
  can, canOpenRoute, buildSidebar, actionsFor, findByRoute, defaultRoute, isFeatureEnabled,
} from './core';

// The hooks every screen uses. All of them read the one payload — no screen
// fetches its own permissions, so two parts of a page can never disagree.

export function useNavigation() {
  return useNavigationContext().nav;
}

/**
 * Gate a button, a menu item, an action.
 *
 *   const canEdit = useCan('operations.bookings.update')
 *
 * NEVER check a role. A role is how access was granted; a permission is what
 * was granted, and only the second one survives somebody renaming a role.
 */
export function useCan(permission) {
  const nav = useNavigation();
  return useMemo(() => can(nav, permission), [nav, permission]);
}

/** Several at once, without one hook call per button. */
export function useCanAll(permissions) {
  const nav = useNavigation();
  return useMemo(
    () => (permissions || []).reduce((acc, p) => ({ ...acc, [p]: can(nav, p) }), {}),
    [nav, permissions],
  );
}

/** Every action held on a module: ['read','update'] — for a toolbar. */
export function useModuleActions(moduleKey) {
  const nav = useNavigation();
  return useMemo(() => actionsFor(nav, moduleKey), [nav, moduleKey]);
}

/** true / false / null — see canOpenRoute. Callers MUST handle all three. */
export function useCanOpenRoute() {
  const nav = useNavigation();
  return useMemo(() => (route) => canOpenRoute(nav, route), [nav]);
}

/**
 * The nav for THIS APP, scoped to its product by default.
 *
 * The product comes from NavigationProvider unless a caller overrides it, so a
 * screen that forgets to scope gets the right answer rather than every other
 * app's routes. Pass `{ product: null }` explicitly to look across all products.
 */
export function useSidebar(options) {
  const { nav, product: appProduct } = useNavigationContext();
  const product = options && 'product' in options ? options.product : appProduct;
  return useMemo(() => buildSidebar(nav, { product }), [nav, product]);
}

export function useRouteContext(route) {
  const nav = useNavigation();
  return useMemo(() => findByRoute(nav, route), [nav, route]);
}

/**
 * Where to send somebody who lands on the app root — the first screen THIS APP
 * can open for them.
 *
 * Scoped to the provider's product. Unscoped it returned the first route across
 * every product the principal could see, which sent a super admin on
 * workspace-dev to /dashboard/admin-accounts and straight into a 404.
 */
export function useDefaultRoute() {
  const { nav, product } = useNavigationContext();
  return useMemo(() => defaultRoute(nav, { product }), [nav, product]);
}

export function useFeatureFlag(key) {
  const nav = useNavigation();
  return useMemo(() => isFeatureEnabled(nav, key), [nav, key]);
}
