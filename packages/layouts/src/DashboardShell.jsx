'use client';
import { NavigationProvider } from '@cocarr/iam-sdk';
import Sidebar from './Sidebar';

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
  return (
    <NavigationProvider fallback={loading} errorFallback={onError}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar product={product} label={label} logoSrc={logoSrc} onSignOut={onSignOut} />
        <main className="flex-1 bg-[#F5F5F5] overflow-y-auto">{children}</main>
      </div>
    </NavigationProvider>
  );
}
