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

export function useSidebar(options) {
  const nav = useNavigation();
  const product = options?.product;
  return useMemo(() => buildSidebar(nav, { product }), [nav, product]);
}

export function useRouteContext(route) {
  const nav = useNavigation();
  return useMemo(() => findByRoute(nav, route), [nav, route]);
}

export function useDefaultRoute() {
  const nav = useNavigation();
  return useMemo(() => defaultRoute(nav), [nav]);
}

export function useFeatureFlag(key) {
  const nav = useNavigation();
  return useMemo(() => isFeatureEnabled(nav, key), [nav, key]);
}
