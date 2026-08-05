'use client';
import { DashboardShell } from '@cocarr/layouts';

// The whole shell for this app. The nav is NOT declared here — DashboardShell
// loads the IAM navigation payload and renders whatever this principal may see
// within the 'operations' product. Adding a screen to this app is a seeding
// change in the authorization service, not an edit to this file.
export default function DashboardLayout({ children }) {
  return (
    <DashboardShell
      product="operations"
      brand={<span className="text-lg font-semibold">Cocarr Operations</span>}
      loading={<div className="p-8 text-sm text-slate-500">Loading your workspace…</div>}
      onError={({ error, retry }) => (
        <div className="p-8">
          <p className="text-sm text-slate-700">We could not load your access ({error.code}).</p>
          <button type="button" onClick={retry} className="mt-3 rounded bg-slate-900 px-3 py-2 text-sm text-white">
            Try again
          </button>
        </div>
      )}
    >
      {children}
    </DashboardShell>
  );
}
