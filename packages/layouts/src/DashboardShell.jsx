'use client';
import { NavigationProvider } from '@cocarr/iam-sdk';
import { Sidebar } from './Sidebar';

// The one place that decides whether page content can scroll.
//
// `h-screen overflow-hidden` pins the app to the viewport, which is what keeps
// the sidebar fixed while content moves — and it is exactly why `<main>` needs
// its own `overflow-y-auto`. Without it nothing below the fold is reachable on
// ANY page, which is a whole-app bug that presents as "this one screen is cut
// off". It was missing once already.
export function DashboardShell({ product, brand, children, loading, onError }) {
  return (
    <NavigationProvider fallback={loading} errorFallback={onError}>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar product={product} brand={brand} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </NavigationProvider>
  );
}
