import {
  IoShieldCheckmarkOutline, IoBriefcaseOutline, IoHeadsetOutline, IoCarSportOutline,
  IoCashOutline, IoMegaphoneOutline, IoTerminalOutline, IoPeopleOutline,
} from 'react-icons/io5'

// Which panel is this build?
//
// ── The hosts ──
//   root.cocarr.com    tier 0   super admin. Every module, every permission.
//   admin.cocarr.com   tier 1   every other team, one combined login.
//   ops. support. finance. growth. developer.
//                      tier 2   one team each. Declared, dormant until built.
//
// ── Two different mechanisms, deliberately ──
//   PANEL  — chosen at BUILD time by NEXT_PUBLIC_PANEL. Decides which pages
//            are reachable in this deployment at all (see ROOT_ONLY_MODULES on
//            what "reachable" does and does not mean here).
//   TEAM   — resolved at RUN time from the signed-in admin. Decides which of
//            those pages this person sees.
//
// `admin.cocarr.com` is ONE build containing every non-super-admin module;
// Operations vs Finance is a runtime distinction within it. Only the
// root/everything-else division is a build-time split today.
//
// That separation is what makes a per-team subdomain cheap later: the runtime
// scoping already does the work, so splitting a build only ever *narrows what
// is already being narrowed*. Bringing `ops.cocarr.com` online is the entry
// below plus a deployment target — no component, routing or nav changes.
//
// NEXT_PUBLIC_* is inlined at build time, so each panel needs its own build.
// You cannot promote one artefact between panels by changing an env var.
//
// ── Access is top-down; this file does not enforce it ──
// The tiers below mirror `src/utils/adminPanels.js` in COCARR-BACKEND, which is
// the enforcement. This copy exists so the UI can say the same thing the server
// will — never so it can decide it.

// Lower is more privileged, like a uid. Compared, never displayed, so the gaps
// cost nothing and leave room to insert a tier later without renumbering.
export const TIER = { ROOT: 0, ADMIN: 1, MODULE: 2 }

// Super-admin territory: the screens that administer the panel itself. They are
// reachable ONLY on root, which is the substance of "split super admin from the
// rest".
//
// Reachable, not absent. The catch-all router statically imports every page
// component, so these are still IN the admin bundle — `panelHasModule` gates
// both the nav and `useCanOpenRoute`, so the route refuses on a lower panel
// whoever is asking. Do not describe this as code-splitting; it is a routing
// gate, and a build that dropped the components is separate work.
const ROOT_ONLY_MODULES = ['adminAccounts', 'roles']

export const PANELS = {
  // root.cocarr.com — super admin. `'*'` means every module navConfig declares.
  // Listing them would mean a new module silently missing from root until
  // somebody remembered to add it, which is the wrong default for the panel
  // that administers everything.
  root: {
    key: 'root',
    label: 'Root',
    tier: TIER.ROOT,
    teams: ['super-admin'],
    modules: '*',
  },
  // admin.cocarr.com — one common login for every other team.
  //
  // Also `'*'`, minus the root-only modules. An exclusion rather than a list so
  // a NEW module lands here automatically: the failure mode of a list is a page
  // that exists and is reachable from nowhere, and it presents as a missing
  // menu entry, which everyone reads as a permissions bug and debugs in the
  // wrong place.
  admin: {
    key: 'admin',
    label: 'Admin',
    tier: TIER.ADMIN,
    teams: ['admin', 'customer-support', 'operations', 'finance', 'marketing', 'developer'],
    modules: '*',
    excludes: ROOT_ONLY_MODULES,
  },

  // ── Per-module panels: declared now, dormant until deployed ──
  //
  // Unused until a deployment sets NEXT_PUBLIC_PANEL to one of them. These DO
  // list their modules, unlike root/admin — that is the point: it is what
  // shrinks the bundle and the menu to one team's work.
  //
  // Keep each list a superset of what that team can actually read. A module
  // missing here is invisible on that panel however the permission grid is
  // later edited.
  //
  // `scripts/checkPanelCoverage.mjs` verifies these against navConfig. It
  // already caught `cms` here — a module that no longer exists, listed twice.
  ops: {
    key: 'ops',
    label: 'Operations',
    tier: TIER.MODULE,
    teams: ['operations'],
    modules: ['dashboard', 'bookings', 'vehicles', 'hosts', 'users', 'support', 'reports'],
  },
  support: {
    key: 'support',
    label: 'Support',
    tier: TIER.MODULE,
    teams: ['customer-support'],
    modules: ['dashboard', 'support', 'bookings', 'users', 'hosts', 'reports'],
  },
  finance: {
    key: 'finance',
    label: 'Finance',
    tier: TIER.MODULE,
    teams: ['finance'],
    modules: ['dashboard', 'payments', 'payouts', 'bookings', 'users', 'hosts', 'reports'],
  },
  growth: {
    key: 'growth',
    label: 'Growth',
    tier: TIER.MODULE,
    teams: ['marketing'],
    modules: ['dashboard', 'marketing', 'users', 'reports'],
  },
  developer: {
    key: 'developer',
    label: 'Developer',
    tier: TIER.MODULE,
    teams: ['developer'],
    modules: ['dashboard', 'systemHealth', 'integrations', 'security', 'settings', 'auditLogs', 'reports'],
  },
}

// `console` and `portal` were the earlier names for root and admin. Accepted so
// a build already carrying the old value keeps working rather than silently
// falling back to the default panel — which, for a `console` build, would mean
// deploying the super-admin site as the admin one.
const ALIASES = { console: 'root', portal: 'admin' }

const resolvePanel = (key) => PANELS[key] || PANELS[ALIASES[key]] || null

// Where each panel lives. Read from env rather than hardcoded so staging and
// production can differ without a code change. An unset entry means "same
// host", which is exactly right until that panel is deployed.
const PANEL_HOSTS = {
  root: process.env.NEXT_PUBLIC_HOST_ROOT || '',
  admin: process.env.NEXT_PUBLIC_HOST_ADMIN || '',
  ops: process.env.NEXT_PUBLIC_HOST_OPS || '',
  support: process.env.NEXT_PUBLIC_HOST_SUPPORT || '',
  finance: process.env.NEXT_PUBLIC_HOST_FINANCE || '',
  growth: process.env.NEXT_PUBLIC_HOST_GROWTH || '',
  developer: process.env.NEXT_PUBLIC_HOST_DEVELOPER || '',
}

// Defaults to `admin` so a deployment that sets nothing gets the combined
// panel — the safe default, since the alternative would ship the super-admin
// build to whoever forgot the variable.
export const PANEL = resolvePanel(process.env.NEXT_PUBLIC_PANEL) || PANELS.admin

// The shared secret this deployment identifies itself with, if it has one. Sent
// on every request; the backend matches it against ADMIN_PANEL_KEYS.
//
// This is not a credential and does not need protecting as one — it is in the
// bundle, so anyone with the site has it. What it proves is which SITE a
// request came from, which `Origin` also does but only for honest browsers.
export const PANEL_KEY = process.env.NEXT_PUBLIC_PANEL_KEY || ''

// Whether this panel ships a given module.
export const panelHasModule = (module) => {
  if (PANEL.excludes?.includes(module)) return false
  return PANEL.modules === '*' || PANEL.modules.includes(module)
}

// The URL to use when linking to a page in `module`.
//
// THE ONE THING A PER-TEAM SPLIT DOES NOT GIVE FOR FREE. Wallet Transactions
// links to a user detail page; if Finance and User Management end up on
// different hosts, that relative link 404s. Every cross-module link should go
// through here.
//
// Until a second host exists it returns the path unchanged and costs nothing,
// which is why it is worth adopting NOW rather than during the split — a link
// added today keeps working either way, and retrofitting them all later means
// finding them all later, which in practice means users finding them.
export const hostFor = (module, path) => {
  if (!module || panelHasModule(module)) return path
  // Not on this panel — find one that ships it and has a host configured.
  // Ordered by tier so the most specific owner wins over root, which ships
  // everything and would otherwise absorb every cross-panel link.
  const owner = Object.values(PANELS)
    .filter((p) => PANEL_HOSTS[p.key] && p.key !== PANEL.key)
    .filter((p) => (Array.isArray(p.modules)
      ? p.modules.includes(module)
      : !p.excludes?.includes(module)))
    .sort((a, b) => b.tier - a.tier)[0]
  return owner ? `${PANEL_HOSTS[owner.key]}${path}` : path
}

// Per-team icon for the sidebar identity block.
//
// Lives here rather than on `adminTeam` for now: a column would let a Super
// Admin pick one, but it would also need seeding, an edit control and a
// fallback — none of that worth blocking the split on. A team created at
// runtime gets the generic badge, which is honest rather than wrong. Moving
// this to the backend later means changing this function and nothing else.
const TEAM_ICONS = {
  'super-admin': IoShieldCheckmarkOutline,
  admin: IoBriefcaseOutline,
  'customer-support': IoHeadsetOutline,
  operations: IoCarSportOutline,
  finance: IoCashOutline,
  marketing: IoMegaphoneOutline,
  developer: IoTerminalOutline,
}

export const teamIcon = (teamKey) => TEAM_ICONS[teamKey] || IoPeopleOutline
