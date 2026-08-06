'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthChange, onSessionExpired, signOut } from '@cocarr/auth-sdk';

// Gate the signed-in area. Wraps the dashboard shell, so no screen has to think
// about authentication.
//
// ── Three states, and the third is why this exists ──
//   unknown   Firebase has not finished restoring the session yet
//   signed in render the app
//   signed out send them to /login
//
// `unknown` must NOT redirect. `auth.currentUser` is null until Firebase
// restores the session asynchronously after page load, so treating null as
// "signed out" bounces every returning visitor to the login screen for a beat
// on every cold load — and if they were mid-task, loses where they were.
//
// ── Automatic sign-out on expiry ──
// Two independent signals, because they catch different failures:
//   1. `onAuthChange(null)` — Firebase itself gave up (token revoked, account
//      disabled, password changed elsewhere).
//   2. `onSessionExpired` — a 401 came back from the API. Firebase can still
//      believe the session is fine while the SERVER has stopped accepting it.
// Either one signs out and redirects with `?expired=1`, so the login screen can
// say what happened rather than silently appearing.
export function RequireAuth({ children, loginPath = '/login', fallback = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState('unknown');

  useEffect(() => onAuthChange((user) => setState(user ? 'in' : 'out')), []);

  useEffect(() => onSessionExpired(() => {
    // Sign out locally too. Without it Firebase still holds a session the server
    // has stopped honouring, so the next navigation looks signed in and every
    // request 401s — which reads as the app being broken rather than as
    // "please sign in again".
    signOut().catch(() => {});
    setState('out');
  }), []);

  useEffect(() => {
    if (state !== 'out') return;
    // `next` so a deep link survives the round trip: somebody following a link
    // to a specific screen should land there after signing in, not on a
    // dashboard they then have to navigate from again.
    const next = pathname && pathname !== '/' ? `&next=${encodeURIComponent(pathname)}` : '';
    router.replace(`${loginPath}?expired=1${next}`);
  }, [state, router, loginPath, pathname]);

  if (state === 'unknown') return fallback;
  if (state === 'out') return fallback;
  return children;
}
