// The screens that administer the panel itself — Admin Accounts, and the
// Team → Level → Module → Screen permission editor.
//
// ── Why they live behind one barrel file ──
// So the admin.cocarr.com build can drop them ENTIRELY. The catch-all router
// imports every other page statically, which means every other page ships to
// every panel; these are the two that must not, because they are how the panel
// itself is administered.
//
// The router reaches this file through a `require()` inside a branch whose
// condition is a build-time constant. `process.env.NEXT_PUBLIC_PANEL` is inlined
// by Next at build time, so on a non-root build webpack sees `if (false)`,
// discards the branch, and never follows the dependency — this module and
// everything it imports (AdminUsersManager, PermissionMatrix, and their
// transitive deps) are absent from that bundle rather than merely unreachable.
//
// `next/dynamic` would NOT have achieved this. A lazy chunk is still emitted and
// still downloadable from admin.cocarr.com; it is deferred, not removed.
//
// ── This is defence in depth, not the boundary ──
// Three things already refuse these screens on a lower panel: `panelHasModule`
// filters the nav, `useCanOpenRoute` refuses the route, and the backend's
// permission grid refuses every call behind them. Removing the code as well
// means a bug in any of those three cannot expose a screen that is not there.
//
// ── Adding a page here ──
// Add its module key to ROOT_ONLY_MODULES in `_helpers/panels.js` at the same
// time, or the nav will keep offering a page the router cannot resolve.
// `scripts/checkPanelCoverage.mjs` checks that list against navConfig.
export { default as SettingsAdminAccountsPage } from './dashboard/settings-admin-accounts/page'
export { default as TeamsAccessPage } from './dashboard/settings-teams/page'

// Superseded by TeamsAccessPage and referenced by no nav entry, so it is
// already unreachable. It is here rather than deleted because it is the legacy
// role×module matrix, and it is root-only for the same reason as the others.
export { default as SettingsRolesPage } from './dashboard/settings-roles/page'
