'use client';
import { NavigationProvider } from '@cocarr/iam-sdk';
import Sidebar from './Sidebar';
import { RequireAuth } from './RequireAuth';

// The app shell, identical in all three apps — taken from COCARR-ADMIN's
// dashboard layout.
//
// `flex h-screen overflow-hidden` pins the app to the viewport, which is what
// keeps the sidebar fixed while content moves — and is exactly why `<main>`
// needs its own `overflow-y-auto`. Without it nothing below the fold is
// reachable on ANY page, a whole-app bug that presents as "this one screen is
// cut off". It was missing once already in the original.
//
// The `#F5F5F5` content background is the brand's, not an arbitrary grey; it
// matches `body` in the design system.
export function DashboardShell({
  product,
  label,
  logoSrc = '/logo.png',
  children,
  loading,
  onError,
  onSignOut,
}) {
  // RequireAuth wraps the NavigationProvider, not the other way round: loading
  // the navigation payload for somebody who is not signed in would fire a
  // guaranteed 401 on every cold load and trip the session-expiry handler.
  return (
    <RequireAuth fallback={loading}>
      {/* The product goes on the PROVIDER, not just the sidebar. The navigation
          payload covers every product this principal can see, and each app ships
          one — so anything reading it unscoped gets routes this app has no page
          for. Setting it here makes scoping the default for every hook below. */}
      <NavigationProvider product={product} fallback={loading} errorFallback={onError}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar product={product} label={label} logoSrc={logoSrc} onSignOut={onSignOut} />
          <main className="flex-1 bg-[#F5F5F5] overflow-y-auto">{children}</main>
        </div>
      </NavigationProvider>
    </RequireAuth>
  );
}
