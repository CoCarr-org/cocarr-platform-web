'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useDefaultRoute, useNavigation, useSidebar } from '@cocarr/iam-sdk';

// Where a person lands, decided by what they may open.
//
// There is no hardcoded landing route: a fixed one is wrong for anyone who
// cannot open it, and a Recruiter and a Finance Manager sign into the same app
// and belong in different places. The first entry of their own navigation is the
// answer.
//
// THE REDIRECT MUST NOT TARGET THIS PAGE. When the first thing somebody can open
// IS /dashboard, replacing the route with /dashboard re-renders this component,
// which redirects again — a loop that presents as a spinner that never resolves.
// So when the default is this route, this page is the destination and renders
// the section index below.
export default function DashboardIndex() {
  const router = useRouter();
  const pathname = usePathname();
  const nav = useNavigation();
  const defaultRoute = useDefaultRoute();
  const groups = useSidebar();
  const redirecting = Boolean(defaultRoute) && defaultRoute !== pathname;

  useEffect(() => {
    if (redirecting) router.replace(defaultRoute);
  }, [redirecting, defaultRoute, router]);

  if (redirecting) {
    return <div className="p-8 text-sm text-slate-500">Taking you to your first screen…</div>;
  }

  // Authenticated with no grants. A real state, not an error — say so plainly
  // rather than spinning forever or bouncing to a route that would refuse them.
  if (nav.ready && groups.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-lg font-semibold text-slate-800">No access yet</h1>
        <p className="mt-2 max-w-prose text-sm text-slate-600">
          You are signed in, but no permissions have been assigned to you in
          Cocarr Platform. Ask an administrator to assign you a role.
        </p>
      </div>
    );
  }

  if (!nav.ready) return <div className="p-8 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="p-8">
      <h1 className="text-lg font-semibold text-slate-800">Cocarr Platform</h1>
      <p className="mt-1 text-sm text-slate-600">
        {groups.length} {groups.length === 1 ? 'section' : 'sections'} available to you.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <Link
            key={group.key}
            href={group.pages[0].route}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
          >
            <div className="text-sm font-medium text-slate-800">{group.label}</div>
            <div className="mt-1 text-xs text-slate-500">
              {group.pages.length} {group.pages.length === 1 ? 'screen' : 'screens'}
              {group.actions.length ? ` · ${group.actions.join(', ')}` : ''}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
