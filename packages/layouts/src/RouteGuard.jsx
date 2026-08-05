'use client';
import { usePathname } from 'next/navigation';
import { useCanOpenRoute } from '@cocarr/iam-sdk';

// Refuses a route the principal may not open.
//
// THE THREE-WAY ANSWER IS THE POINT. `null` is not "no":
//   null   still loading, or not a nav route at all (every `[id]` detail page
//          is reached FROM a permitted list page and is never in the tree)
//   false  known and filtered out — refuse it, and say which page it was
//   true   allowed
//
// Treating null as a denial locks people out of every detail screen in the app.
// Treating it as an allow makes the guard decorative. So: render children on
// true AND null, and refuse only on an explicit false.
//
// This is also why "you may not open this" and "no such page" stay separate
// messages — conflating them tells somebody their permissions are broken when
// they have simply mistyped a URL.
export function RouteGuard({ children, deniedFallback = null, loading = null }) {
  const pathname = usePathname();
  const canOpen = useCanOpenRoute();
  const verdict = canOpen(pathname);

  if (verdict === false) return deniedFallback;
  if (verdict === null && loading) return loading;
  return children;
}
