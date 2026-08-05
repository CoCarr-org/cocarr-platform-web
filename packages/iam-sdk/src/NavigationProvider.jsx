'use client';
import {
  createContext, useContext, useCallback, useEffect, useMemo, useState,
} from 'react';
import { platformApi } from '@cocarr/api-sdk';
import { emptyNavigation, fromPayload } from './core';

// Loads GET /v1/platform/me/navigation once, high in the tree, and hands it to
// every screen below. Mount it in each app's dashboard layout.
//
// ── WHY IT REFETCHES ON MOUNT, NOT ONLY AT SIGN-IN ──
// A session left open for a week would otherwise still be rendering permissions
// a Super Admin changed on Monday. One small request per page load makes a
// permission change take effect on the next navigation rather than the next
// sign-in. (The same reasoning as the old useAdminProfile.)
//
// ── THREE STATES, NOT TWO ──
// `ready:false` means UNKNOWN, never "no access". Rendering an empty sidebar
// while the payload is in flight flashes "you have nothing" at somebody who has
// everything; render a skeleton on !ready instead. `error` is separate again,
// because "we could not load your access" and "you have no access" call for
// completely different screens — and only one of them is worth retrying.

const NavigationContext = createContext({
  nav: emptyNavigation(), error: null, reload: () => {},
});

export function NavigationProvider({ children, fallback = null, errorFallback = null }) {
  const [nav, setNav] = useState(emptyNavigation());
  const [error, setError] = useState(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => { setError(null); setNonce((n) => n + 1); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await platformApi().get('/me/navigation');
        if (!cancelled) { setNav(fromPayload(res.data)); setError(null); }
      } catch (e) {
        // Deliberately does NOT fall back to an empty-but-ready navigation: that
        // would be indistinguishable from a real "you have no access" and would
        // send people to argue with an administrator about a network blip.
        if (!cancelled) setError(e.platform || { code: 'ERROR', message: e.message });
      }
    })();
    return () => { cancelled = true; };
  }, [nonce]);

  const value = useMemo(() => ({ nav, error, reload }), [nav, error, reload]);

  if (error && errorFallback) return errorFallback({ error, retry: reload });
  if (!nav.ready && fallback) return fallback;

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  return useContext(NavigationContext);
}
