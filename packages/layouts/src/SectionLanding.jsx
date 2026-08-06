'use client';
import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@cocarr/iam-sdk';

// The index for a grouping path — /dashboard/workspace, /dashboard/finance,
// /dashboard/platform and the rest.
//
// Those segments group real screens but were never pages themselves, so every
// one of them 404'd. Nothing in the sidebar links to them (it links leaf routes
// straight from IAM), which is exactly why it went unnoticed: you only reach one
// by typing it, truncating a URL, or following a breadcrumb — all of which
// people do, and all of which landed on a Next.js 404.
//
// It renders FROM THE SERVER-FILTERED NAV, never from a hardcoded list. The
// payload behind `useSidebar` has already been narrowed to this principal, so
// this page shows exactly the screens they may open and cannot drift from the
// sidebar beside it. A hardcoded list here would be a second copy of the
// permission rules, and it would drift in both directions — advertising screens
// that 403 and hiding ones the server allows.

const normalise = (r) => String(r || '').replace(/\/+$/, '') || '/';

export function SectionLanding({ title, description }) {
  const pathname = usePathname();
  const groups = useSidebar();

  const prefix = normalise(pathname);

  // Every page under this segment, de-duplicated: a module's landing route and
  // one of its sub-modules can be the same route.
  const { pages, ready } = useMemo(() => {
    const seen = new Set();
    const out = [];
    (groups || []).forEach((g) => {
      (g.pages || []).forEach((p) => {
        const route = normalise(p.route);
        if (route === prefix || !route.startsWith(`${prefix}/`)) return;
        if (seen.has(route)) return;
        seen.add(route);
        out.push({ ...p, route, group: g.label });
      });
    });
    out.sort((a, b) => a.label.localeCompare(b.label));
    // `groups` is [] both while the payload is loading and when the principal
    // genuinely holds nothing. Those must not look the same — an empty state
    // shown to someone who has everything reads as "my access was revoked".
    return { pages: out, ready: Array.isArray(groups) && groups.length > 0 };
  }, [groups, prefix]);

  const heading = title
    || prefix.split('/').filter(Boolean).pop()?.replace(/-/g, ' ')
    || 'Section';

  return (
    <div className='max-w-5xl mx-auto pb-10'>
      <h1 className='text-2xl font-bold tracking-tight capitalize mt-2 mb-1'>{heading}</h1>
      {description && <p className='text-sm text-[#757575] mb-6'>{description}</p>}

      {!ready && (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
          {[0, 1, 2].map((i) => (
            <div key={i} className='h-20 rounded-md bg-gray-50 border border-gray-100 animate-pulse' />
          ))}
        </div>
      )}

      {ready && pages.length === 0 && (
        <p className='text-sm text-[#757575] bg-white border border-gray-100 rounded-md px-5 py-6'>
          You do not have access to any screen in this section.
        </p>
      )}

      {ready && pages.length > 0 && (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'>
          {pages.map((p) => (
            <Link
              key={p.route}
              href={p.route}
              className='block bg-white border border-gray-100 rounded-md px-5 py-4 hover:border-gray-300 transition-colors'
            >
              <p className='font-semibold text-sm'>{p.label}</p>
              {p.group && p.group !== p.label && (
                <p className='text-[11px] text-[#959595] mt-1'>{p.group}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default SectionLanding;
