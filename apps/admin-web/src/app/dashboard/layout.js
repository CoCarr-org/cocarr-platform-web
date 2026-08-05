'use client';
import { DashboardShell } from '@cocarr/layouts';

// The whole shell for this app — the same component in all three, so the three
// sites cannot drift apart visually.
//
// The nav is NOT declared here. DashboardShell loads the IAM navigation payload
// and renders whatever this principal may see within the 'platform' product, so
// adding a screen is a seeding change in cocarr-authorization-service rather
// than an edit to this file.
export default function DashboardLayout({ children }) {
  return (
    <DashboardShell
      product="platform"
      label="Platform"
      loading={
        <div className="flex h-screen items-center justify-center bg-[#151515]">
          <p className="text-[13px] text-[#a3a3a3]">Checking your access…</p>
        </div>
      }
      onError={({ error, retry }) => (
        <div className="flex h-screen items-center justify-center bg-[#151515]">
          <div className="max-w-sm text-center">
            <p className="text-[14px] text-[#e3e3e3]">We could not load your access.</p>
            <p className="mt-1 text-[12px] text-[#757575]">{error.message} ({error.code})</p>
            <button type="button" onClick={retry} className="btn-md mt-4">Try again</button>
          </div>
        </div>
      )}
    >
      {children}
    </DashboardShell>
  );
}
