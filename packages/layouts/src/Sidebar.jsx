'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@cocarr/iam-sdk';

// THE SIDEBAR IS SERVER DATA NOW.
//
// It renders `useSidebar()`, which is the IAM navigation payload — there is no
// nav config in the frontend any more. A new module reaches this menu by being
// seeded in the authorization service; nobody deploys a client to add a link.
//
// ── The scroll rules are load-bearing, keep them ──
// The shell pins the app to `h-screen overflow-hidden`, so this list needs
// `flex-1 min-h-0 overflow-y-auto` to scroll at all, and the logo block needs
// `shrink-0` so it is not compressed. **`min-h-0` is the non-obvious part**: a
// flex child defaults to `min-height:auto` and refuses to shrink below its
// content, so `overflow-y-auto` alone does nothing and the list simply runs off
// the bottom of the screen. This surfaced the moment a group grew to nine items.
//
// ── Expand state lives in ONE place ──
// `open` is the only source of truth for which group is expanded. An earlier
// version also forced a group open whenever the pathname matched one of its
// children, which meant the chevron could set the state to closed while the
// pathname half kept it open — so a group could never be collapsed while you
// were inside it. The effect below auto-opens the active group on navigation;
// do not reintroduce a pathname check in the render.
export function Sidebar({ product, brand = null }) {
  const groups = useSidebar({ product });
  const pathname = usePathname();
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const active = groups.find((g) => g.pages.some((p) => pathname?.startsWith(p.route)));
    if (active) setOpen(active.key);
  }, [pathname, groups]);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="shrink-0 px-5 py-4">{brand}</div>

      {/* min-h-0 — see the note above. Without it this never scrolls. */}
      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-4">
        {groups.map((group) => {
          // A single-screen module is a plain link. An expandable group
          // containing exactly one item is just friction.
          if (group.single) {
            const page = group.pages[0];
            return (
              <SidebarLink key={group.key} href={page.route} active={pathname === page.route}>
                {group.label}
              </SidebarLink>
            );
          }
          const isOpen = open === group.key;
          return (
            <div key={group.key}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : group.key)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                <span>{group.label}</span>
                <span aria-hidden className={isOpen ? 'rotate-90 transition' : 'transition'}>›</span>
              </button>
              {isOpen && (
                <div className="ml-3 border-l border-slate-200 pl-2">
                  {group.pages.map((page) => (
                    <SidebarLink key={page.key} href={page.route} active={pathname === page.route}>
                      {page.label}
                    </SidebarLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function SidebarLink({ href, active, children }) {
  return (
    <Link
      href={href}
      className={`block rounded px-3 py-2 text-sm ${active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {children}
    </Link>
  );
}
