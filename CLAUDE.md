# cocarr-platform-web

**Turborepo.** Three independently deployed Next.js apps over one set of shared
packages. **Working branch: `develop`.**

| App | Product | Host | Port |
|---|---|---|---|
| `apps/admin-web` | `platform` | admin.cocarr.com | 3100 |
| `apps/workspace-web` | `workspace` | workspace.cocarr.com | 3200 |
| `apps/operations-web` | `operations` | ops.cocarr.com | 3300 |

The existing business modules (bookings, hosts, payments, users, marketing,
reports, master data) belong to **operations-web**, not admin-web — admin-web is
Platform Administration, which is mostly IAM screens that did not exist before.

## The nav is server data. There is no nav config.
`@cocarr/iam-sdk` consumes `GET /v1/platform/me/navigation`, which returns the
taxonomy **already filtered** to the caller plus their flat permissions, openable
routes and feature flags. `<DashboardShell product="…">` renders the sidebar from
it. **A new screen reaches the menu by being seeded in
cocarr-authorization-service — no frontend deploy.**

- **Never check a role in the UI; check a permission.** `useCan('operations.bookings.update')`,
  or `<Can permission="…">`. A role is how access was granted; a permission is
  what was granted, and only the second survives a role being renamed.
- **The client never decides anything.** It renders what the server filtered. A
  second implementation of the rules drifts, and the drift is invisible both
  ways: hide what the server allows and the app looks broken; show what it denies
  and every click is a 403.
- **`canOpenRoute` answers `true` / `false` / `null`, and `null` is not "no".**
  It means "still loading, or not a nav route at all". Every `[id]` detail page
  is reached FROM a permitted list page and is never in the tree — treat `null`
  as a denial and you lock people out of every detail screen in the app.
- **`ready:false` is not "no access".** Render a skeleton, or you flash an empty
  sidebar at somebody who has everything.

## Package boundaries that matter
- **`@cocarr/auth-sdk` is the ONLY package that touches Firebase.** Three copies
  of the session logic existed before. `whenAuthReady()` is why: `auth.currentUser`
  is null until Firebase restores the session asynchronously, while redux-persist
  rehydrates synchronously — so the app believes it is signed in and fetches a
  beat too early. That window 401'd `/admin/me` on every cold load.
- **`@cocarr/api-sdk` is gateway-first.** Name a service, get its gateway prefix.
  Direct per-service URLs are an opt-in downgrade, not the default: a service
  reachable directly is a service whose rate limiting, CORS and correlation ids
  are optional.
- **Workspace packages ship as SOURCE**, so every app needs `transpilePackages`
  in `next.config.mjs` — without it a JSX file from `packages/` reaches the
  bundler untransformed and the build fails on the first tag.

## Layout / scrolling — unchanged rules, new home
`@cocarr/layouts`. The shell is `flex h-screen overflow-hidden`, so `<main>`
needs `overflow-y-auto` or nothing below the fold is reachable on any page. The
sidebar's nav list needs `flex-1 min-h-0 overflow-y-auto` with `shrink-0` on the
logo block. **`min-h-0` is the non-obvious part** — a flex child defaults to
`min-height:auto` and will not shrink below its content, so `overflow-y-auto`
alone does nothing.

Expand/collapse state lives solely in the sidebar's `open` state. Do not also
derive it from the pathname: that combination makes a group impossible to
collapse while you are inside it.

## Migration status — READ THIS FIRST
**The structure and the shared SDKs exist; the 169 existing files have not
moved.** `src/app/**` is still the old single app and still works. See
[MIGRATION.md](MIGRATION.md) for the file-by-file plan, the deletions and the
acceptance test. It was split this way because the machine could not run a build
(disk full), and moving 169 files with rewritten imports unverified would produce
a tree that looks finished and is invisibly broken.

## Images — private bucket, must proxy
`@cocarr/shared-utils` `photoUrl()`. Uploaded images live in a private bucket;
raw links 403. Apply it to every `<img src>` sourced from a DB field. Both key
formats must keep working — `<folder>/<uuid>` and the bare legacy `<uuid>`, since
old rows were never migrated. The folder list mirrors `storageFolders.js` on the
backend; adding one there means adding it here.

---

# Legacy notes (the single admin app, still live under `src/app/`)


## Routing is NOT real Next.js file-based routing
`src/app/[[...slug]]/page.js` is a single catch-all that hand-rolls its own router: every page component is statically imported at the top, then mapped in a `staticRouteMap` object (`{'/dashboard/x': XPage}`) or matched against a dynamic-route regex further down. **Adding a new page under `src/app/_pages/...` does nothing by itself** — you must also import it and add a `staticRouteMap` entry (or a regex branch for `[id]`-style routes) in this file, or the path silently falls through to the Dashboard home page instead of 404ing. This is the single easiest thing to forget when adding a page here.

## Layout / scrolling
`src/app/_pages/dashboard/layout.js` wraps every dashboard page (`<div className="flex h-screen overflow-hidden"><Sidebar/><main>{children}</main></div>`) — this is the ONE place controlling whether page content can scroll at all, since it pins the whole app to `h-screen overflow-hidden`. `<main>` needs `overflow-y-auto` or nothing below the fold is reachable on any page — this was missing and got fixed. If a scroll complaint ever comes back, check here first before touching individual pages.

The sidebar's own nav list needs the same treatment separately (`flex-1 min-h-0 overflow-y-auto` on the nav container, `shrink-0` on the logo block). **`min-h-0` is the non-obvious part** — a flex child defaults to `min-height:auto` and refuses to shrink below its content, so `overflow-y-auto` alone does nothing and the list just runs off-screen. This surfaced once Settings grew to 9 children.

## Structure
- `src/app/_pages/dashboard/...` — one folder per section, `page.js`/`page.jsx` per route (see routing caveat above)
- `src/app/_components/` — shared components (Sidebar, DataTable, Header, Popup, Select, ImageSlider, CropUpload, etc.)
- `src/app/_helpers/` — `axios.js` (`authAxios`, the authenticated instance — `baseURL` from `NEXT_PUBLIC_BASE_URL`, defaults `http://localhost:3030/v1`, attaches the Firebase ID token), `media.js` (photoUrl), `utils.js` (date formatting), `constants.js`. **Use `authAxios` for API calls, not the bare `axios` import** — several existing pages call bare `axios.get('/relative/path')` with no configured baseURL, which only works if something outside this repo (a reverse proxy / shared domain routing on Railway) forwards it; `authAxios` doesn't depend on that.

**Gotcha**: several older pages build URLs with `` `${process.env.REACT_APP_BASE_URL}/...` `` — that env var doesn't exist in a Next.js app (client env vars need the `NEXT_PUBLIC_` prefix), so it's always `undefined` and the resulting string is a broken relative path. `authAxios` already has the correct `baseURL` configured — just call `authAxios.get('/whatever')` directly, don't prefix it with an env var at all. Fixed in `users/page.js`'s export/create-user calls; likely present elsewhere (grep for `REACT_APP_BASE_URL` if something's silently not hitting the API).

## Images — private bucket, must proxy
Same private-bucket situation as web/mobile. `src/app/_helpers/media.js` (`photoUrl()`) rewrites raw bucket URLs/bare keys to `${NEXT_PUBLIC_BASE_URL}/image/:key`, and will also **re-proxy an already-proxied URL that points at a different host** (e.g. `User.profilePhoto`'s server-side getter proxies against the backend's own `PUBLIC_API_URL`, which may not match this client's `NEXT_PUBLIC_BASE_URL` — see COCARR-BACKEND's CLAUDE.md). Apply `photoUrl()` to every `<img src>` sourced from a DB field (vehicle images, profile photos, ride photos) — raw bucket URLs 403.

## Nav
`src/app/_components/Sidebar.jsx` — `tenantMenu` array defines the sidebar. Current shape:
- **"Configurations"** (icon `IoLibraryOutline`) — reference/master-data + generic app config: Preferences, Protection Plans, Membership Types, Cities, Brands, Pickup Points. All live under `/dashboard/settings/*` and share `settings/layout.js`'s internal sub-tab bar.
- **"Settings"** — a 9-item dropdown, one page per section (Administration, General, Security, Notifications, Integrations, Storage, Localization, Audit, About), each at its own top-level route (`/dashboard/administration`, `/dashboard/general-settings`, ...) deliberately **not** nested under `/dashboard/settings/*` (that path is Configurations' territory with its own sub-tab bar, which wouldn't apply here).

**The sidebar only supports two levels** (a group + its flat children) — there's no third level for "Settings → Administration → Admin Users"-style nesting. Each of the 9 section pages instead has its own **in-page tab bar** (`SettingsSectionLayout` component, `items: [{key, label, content}]`) for its own items — that's where the third level of any requested nav tree actually lives. `SettingsPlaceholder` is the shared "not built yet" empty state for anything without real functionality behind it.

The `Item` component renders a dropdown if `data.children` exists, or a plain `Link` otherwise. Convention: a parent group's own `url` should match its first child's `url` (used when the dropdown-click handler auto-navigates).

**Expand/collapse state lives solely in the parent's `openDropdown`.** `Item`'s `isOpen` used to be `openDropdown === data.title || <pathname matches a child>`, which meant a group was force-open the whole time you were on one of its pages — the chevron set `openDropdown` to null but the pathname half kept it true, so it could never be collapsed. The parent's `useEffect` already auto-opens the matching group on route change, so don't reintroduce a pathname check inside `Item`.

`settings/page.js` (bare `/dashboard/settings`) is leftover dead code — a broken rides-list component, not a settings page — not linked from the sidebar, but still reachable if someone navigates there directly since the catch-all router does map it.

## The dashboard is per-team, composed by level
`_pages/dashboard/page.js` renders **whatever `GET /admin/dashboard/summary` returns** and filters nothing. The composition lives on the backend (`dashboardSummaryService`) because teams and levels are edited at runtime by a Super Admin — a layout baked into the client would go stale the moment somebody changed the grid, and a second copy of the permission rules here would drift from the server's silently.

Each block is gated on its own module **and action**, so level works with no per-level branching: an Operations *Agent* (read-only) gets the bookings queue, a *Manager* on the same team also gets approvals, disputes and damage claims.

**The Dashboard nav group is now ONE page**, not five. A group whose only child is itself renders as an expandable menu containing one item, which is just friction.

**The four ex-sub-pages are not deleted.** Analytics, Live Activity, Notifications and Quick Actions keep their page components and were added to `staticRouteMap`, so their URLs still work — without that the catch-all silently drops them on Dashboard, which looks like the page vanished rather than moved. They are simply no longer nav entries; their content belongs in dashboard blocks.

**The old charts dashboard is preserved** at `_pages/dashboard/_components/PlatformOverview.jsx` and imported by nothing. It is **not team-scoped** — it calls the platform-wide overview and report endpoints directly, so rendering it for everyone would hand a Support agent the whole platform's revenue. Split it into module-scoped blocks before reintroducing it.

## Panels — root. / admin. / per-module, top-down
`_helpers/panels.js`. A panel is **a tier + a set of teams** (enforced server-side in the backend's `utils/adminPanels.js`) and **a set of modules** (what this build ships).

| `NEXT_PUBLIC_PANEL` | Host | Tier | Modules |
|---|---|---|---|
| `root` | `root.cocarr.com` | 0 | `'*'` — everything |
| `admin` | `admin.cocarr.com` | 1 | `'*'` minus `ROOT_ONLY_MODULES` |
| `ops` `support` `finance` `growth` `developer` | `<team>.cocarr.com` | 2 | explicit lists |

**`ROOT_ONLY_MODULES` (`adminAccounts`, `roles`) is the substance of the super-admin split.** On `admin.cocarr.com` those routes refuse for everyone — including a super admin, whom the top-down rule *does* allow onto that panel. They open those screens at `root.cocarr.com`.

**Those pages are genuinely absent from the admin bundle**, not merely unreachable. `src/app/_pages/rootOnly.js` is a barrel reached only through a `require()` inside a build-time-eliminated branch in the catch-all router, so webpack never follows the dependency on a non-root build — the page components and everything they import (`AdminUsersManager`, `PermissionMatrix`) are not shipped.

> ⚠ **The condition must be written inline in the `if`.** Webpack collects `require()` dependencies while PARSING and only skips a branch it can evaluate at that moment; DefinePlugin has already substituted a literal for `process.env.NEXT_PUBLIC_PANEL`, so `"admin" === "root"` folds and the branch is dropped. **Hoisting it to `const IS_ROOT_PANEL = …` does not work** — webpack does not propagate the constant that far, parses the require, and pulls the module in anyway. Terser then removes the dead *call* but not the module, so the build succeeds, the branch is unreachable, and the screens ship regardless. This was the first attempt and it silently did nothing; caught by grepping both bundles for a string unique to those pages. Verify that way after any change here.
>
> `next/dynamic` is **not** an alternative: a lazy chunk is still emitted and still downloadable from `admin.cocarr.com`. Deferred is not removed.

Three other things already refuse these screens on a lower panel — `panelHasModule` filters the nav, `useCanOpenRoute` refuses the route, and the backend's grid refuses every call. Removing the code is defence in depth on top of those, not instead of them. Admin is an *exclusion* of `'*'` rather than a list, so a NEW module lands there automatically — the failure mode of a list is a page that exists and is reachable from nowhere, and it presents as a missing menu entry, which everyone reads as a permissions bug and debugs in the wrong place.

**`NEXT_PUBLIC_PANEL` defaults to `admin`, not root.** A target that forgets the variable gets the less privileged build. `console`/`portal` are accepted as aliases for `root`/`admin` so an existing build does not silently fall back — for a `console` build that fallback would have published the super-admin site as the admin one.

**Access is top-down; this file does not enforce it.** The tiers mirror the backend, which is the enforcement. This copy exists so the UI can say the same thing the server will — never so it can decide it.

**Each panel is a separate login, not just a separate URL.** The login screen names the panel above the password box, and on submit calls `/admin/me` before navigating: a wrong-panel account is signed straight back out with a sentence saying where to go, instead of landing on a dashboard that then refuses to load. Only `code: 'panel_denied'` stops the sign-in — every other failure falls through to `PanelBoot`, which has proper states for those. Turning a transient blip into "you cannot sign in here" would be a lie the person cannot debug.

### The panel key, and why the direct one is only a speed bump
Two modes, and the difference matters:

- **Direct (default).** `authAxios` sends `x-cocarr-panel-key` from `NEXT_PUBLIC_PANEL_KEY`. `NEXT_PUBLIC_*` is **inlined into the client bundle**, so this value is readable by anyone who opens the site and therefore replayable by `curl` — the exact caller it was meant to distinguish from a browser. It stops someone pointing a browser at the wrong panel and stops nothing else. Do not describe it as unforgeable.
- **Gateway (`NEXT_PUBLIC_PANEL_GATEWAY=true`).** `authAxios` targets `/api/panel` on this app's own origin, and `src/app/api/panel/[...path]/route.js` forwards to the API adding the key from **`PANEL_KEY`** — no `NEXT_PUBLIC_` prefix, so Next never inlines it and it exists only in the server process. A request bearing a valid root key must have passed through the root deployment. Opt-in, because it puts a hop in front of every admin request.

The gateway forwards `authorization`/`content-type`/`accept` and nothing else — **not `Origin`, not cookies, and not any client-supplied `x-cocarr-panel-key`**. Forwarding Origin would hand the backend a second, weaker, browser-sourced signal about which panel this is, which is what the gateway exists to stop relying on. An unreachable API is a **502**, not a 500: the gateway worked and the thing behind it did not, and conflating them sends whoever debugs it to the wrong process.

In gateway mode the client deliberately does **not** also send its own key: the backend treats a non-matching key as a hard deny, so a stale `NEXT_PUBLIC_PANEL_KEY` left over from before the cutover would break every request rather than be ignored.

**Standing a per-team panel up is this entry plus a build target.** No component, routing or nav changes, because the nav, the router map and the sidebar all derive from one filtered navConfig, and team scoping already runs at runtime — a per-team build only narrows what is already being narrowed. **Keep each module list a superset of what that team can read.**

**`scripts/checkPanelCoverage.mjs`** verifies the lists against navConfig and exits non-zero on a panel referencing a module that doesn't exist. It immediately caught `cms` listed on two panels. It also checks `ROOT_ONLY_MODULES` against navConfig: a root-only module navConfig has never heard of means the exclusion is doing nothing and those screens are shipping on `admin.` — invisible, because the pages keep working exactly as they did before. Root-only modules are excluded from the orphan warning, or it would fire permanently and get scrolled past.

**`hostFor(module, path)` is the one thing a split does not give for free.** Wallet Transactions links to a user detail page; once Finance and User Management are on different hosts that relative link 404s. Owners are sorted **by tier descending** so the most specific panel wins — otherwise root, which ships everything, would absorb every cross-panel link. Until a second host exists it returns the path unchanged and costs nothing, which is exactly why cross-module links should adopt it **now**: retrofitting later means finding them all later, which in practice means users finding them.

## Action gating — hide, don't disable
Layer 3 of the permission model: team+level decides which *buttons* appear, not just which pages.

- **`ResourceManager` takes a `module` prop** and derives Add / Edit / Delete from `can(module, action)`. It backs Content Management, Feature Flags, Templates, Legal Pages, IP Whitelist and the log views, so wiring it once covers all of them. `ListPage` passes `entry.module`, which `NAV_ROUTES` already resolves as `page.module || group.module`. **The prop is optional** — a caller that omits it keeps the old behaviour, so this could not break screens that hadn't been updated.
- **The user detail decision bar** applies TWO gates, answering different questions: `allowedActions(status)` — is this valid from this state? — and `can('users','update')` — may this admin do it at all? Both must pass.
- **Per-document actions** (Mark verified, Reject document, both re-checks) are all `users.update` server-side, including the re-checks — they re-query a provider and write. A view-only admin gets the cards and the scans and no action row.
- **The verification queue** gates its three action clusters the same way and shows "View only" per row.

**Hide, don't disable.** A greyed-out Delete invites "why can't I?", and the honest answer — "your level cannot" — is better delivered by its absence plus the level shown in the sidebar. Disabling is for *temporarily* unavailable, not *never yours*. Where the whole action area would otherwise go blank, say so ("View only", "You have view-only access to user verification") — an empty space where buttons clearly used to be reads as a broken screen.

**Hooks before early returns.** `usePermissions()` must be called at the top of a component, not next to where it is used — the user detail page has `if (loading) return …` in between, and calling it later breaks the rules-of-hooks order. Caught by lint; worth remembering when gating another screen.

## `authAxios` waits for Firebase — do not read `auth.currentUser` directly
`auth.currentUser` is **null until Firebase has restored the session**, which it does asynchronously after page load. Any request fired in that window goes out with no Authorization header and comes back `401 Unauthorized - Missing Authorization Header`.

That window is easy to land in, because **redux-persist rehydrates synchronously** from localStorage: the app believes it is signed in and starts fetching a beat before Firebase agrees. `GET /admin/me` in the dashboard layout hit this on every cold load.

The request interceptor now awaits the first `onAuthStateChanged` before attaching the token, then answers instantly forever after. A genuinely signed-out user resolves to null and the request goes unauthenticated — correct, because the endpoint should refuse it rather than the client pretending.

**Any new code that needs the Firebase user must not read `auth.currentUser` synchronously on mount.** `authAxios` already handles it for API calls; anything else should wait on `onAuthStateChanged`.

> **Unrelated but worth knowing:** the interceptor calls `getIdToken(true)`, forcing a token refresh on **every single request**. Firebase caches tokens for an hour and refreshes them on its own, so this adds a round-trip per API call. Left as-is here because changing token-refresh semantics deserves its own change, but it is almost certainly not wanted.

## Boot gate — the panel never renders before it knows who you are
`_components/PanelBoot.jsx`, gated in `dashboard/layout.js` on **two** things: Firebase settling, then `GET /admin/me` answering.

The second is not optional. The sidebar, the router gate and every `can()` read the permission grid, and until it lands the grid is null — which the helpers correctly treat as *nothing*. Rendering the panel before then shows a signed-in admin an empty sidebar and a No Access page for a beat, then snaps to the real thing. **That reads as "my access was just revoked."**

It names what it is waiting on rather than showing a bare spinner, and it distinguishes two failure states: `error` (transient — offers Try again, wired to `useAdminProfile().reload()`) and `blocked` (the backend refusing because there is no `admins` row — a real answer, so it offers sign-out instead of a retry that cannot help).

## ONE permission screen — Team → Level → Module → Screen
`settings-teams` (route `/dashboard/teams-access`, labelled **Roles & Permissions**) is now the only permission editor, showing all four levels in one place:

1. **Team** — the list on the left
2. **Level** — tabs within the selected team (Manager / Specialist / Agent)
3. **Module** — a row per module, with C/R/U/D
4. **Screen** — each module row expands into its pages

**"Teams & Access" and "Roles & Permissions" used to be two separate nav entries for two different systems** — the team/level grid, which `requirePermission` actually enforces, and the legacy role×module matrix, which nothing reads. Two screens for one job and only one of them did anything: an admin could edit the decorative one and reasonably conclude permissions were broken. Merged under the name people look for; `/dashboard/admin-roles` still resolves here so bookmarks land on the real editor. `settings-roles/page.js` and `PermissionMatrix` are left in place but unreferenced by the nav and annotated as superseded.

Screens are derived from `NAV_MODULES`, so the list cannot drift from the nav it gates.

**Super Admin has no grid, and the screen says so.** `resolveAccess` returns a full grid for `super-admin` unconditionally and never reads those rows — so the editor used to accept changes, save them, show them back, and have them do nothing. Someone tightening super admin's access would have believed they had. The backend now **400s** on a write to that team and the UI shows an explanation in place of the grid, so nobody reaches the error by trying. Storing permissions that are never consulted is the worst option: it looks like a configuration that holds, and the only way to find out it does not is to rely on it.

## Sub-module permissions — per SCREEN, not just per module
`can(module, action, route)` / `canRead(module, route)`. The third argument is the **nav route**, which is the override key.

An override **wins outright** over the module grid rather than being intersected — so a Super Admin can grant one screen inside a module a team otherwise cannot open. `useVisibleNav` and `useCanOpenRoute` both pass `p.route`, so a screen granted individually is no longer hidden by its module.

**Teams & Access edits them** (`settings-teams`). Each module row expands into its screens, derived from `NAV_MODULES` so the list cannot drift from the nav it gates. Collapsed by default — most screens inherit, and 58 rows at once would bury the handful that don't; an amber dot on the toggle keeps overrides discoverable while collapsed.

**Adding an override seeds it from the module's current row**, so it starts as "same as now" and the admin changes only what they mean to. Seeding blank would make every override begin by silently revoking everything. **Reset to module** removes it; the save sends the remaining set and the backend deletes what's absent.

**An overridden row is marked by the row itself** — a left amber accent bar, a tinted background and a dot — not by a badge next to the label. The question being asked of 58 rows is "which of these deviate", and that is a scanning question: an edge you run your eye down answers it, a word you have to read on each row does not. The dot repeats the accent for anyone who can't rely on colour alone.

**Amber means "deviates from the module" throughout** — the row accent, the dot, the Override button, and the count on the module's Screens toggle. **Reset is neutral, not red**: returning a screen to its module default is a reset, not a destructive act, and red would make the safe direction look like the dangerous one.

**The route is not displayed.** Screen labels are unique within each module (verified against navConfig), so the path added noise without disambiguating anything. It is still the override key — just not shown.

⚠ **This gates the UI. Backend enforcement is opt-in per route** (`requirePermission(module, action, submodule)`) and most routes have not opted in — one endpoint usually serves several screens. Do not present per-screen permissions as access control until the routes behind them are mapped.

## Team-scoped navigation — the panel knows who you are now
`GET /admin/me` fills the auth slice with the admin's **team**, **level** and full **permission grid**; `_helpers/permissions.js` reads it. Before this the panel knew neither, so it rendered every menu item for everybody and people discovered their access by collecting 403s.

- **`usePermissions()`** — `can(module, action)`, `canRead(module)`, plus `team`, `level`, `ready`, `enforced`.
- **`useVisibleNav()`** — the nav filtered by panel ∩ team+level. **Gates per PAGE, not per group**: navConfig overrides the module on individual pages (Finance holds Wallets → `users`, Taxes → `settings`, Host Bank Accounts → `payouts`), so judging a group by its own module would both hide pages someone can open and show groups containing nothing they can. A group survives only if one of its pages does.
- **`useCanOpenRoute()`** — used by the catch-all router. `null` means "not a nav route, or not loaded yet" → don't block; the server is the real gate.

**This file never decides anything.** The grid comes from the backend's `resolveAccess`, the same function `requirePermission` enforces with. A second implementation of the rules here would drift, and the drift is invisible both ways: hide what the server allows and the panel looks broken; show what it denies and every click 403s.

**Search and pinned pages derive from the visible nav**, not `NAV_MODULES` — otherwise pages leak back in through the search box, or a page pinned before a permission change becomes a shortcut into a 403.

**Dry-run is mirrored, not overridden.** When `enforced: false` the server allows everything, so the panel shows everything behind a banner. Gating strictly against a permissive server would make dry-run useless for the one thing it exists for — debugging a lockout without a deploy.

**A denied route renders `NoAccess`, never a fallthrough.** Unknown paths in the catch-all land on Dashboard, so without this a denied link silently deposits someone on the home page as though they mistyped — which reads as flakiness and hides a real permissions problem from the person best placed to report it. It names the team and level in force, because "ask an admin for access" is unactionable without them.

`_helpers/panels.js` holds the build-time panel manifest (`NEXT_PUBLIC_PANEL`), the tier hierarchy and per-team icons. See the Panels section above and `docs/MULTI-PANEL-PLAN.md`.

**Fixed in passing: there were two `authSlice` files.** `src/store/authSlice.js` was never wired into the store, and `Sidebar` imported `logout` from it. It worked only because both slices were named `'auth'`, so RTK generated the same `auth/logout` action type — rename either and logout would have broken silently. The orphan is deleted.

## ResourceManager — use this for new CRUD screens
`_components/ResourceManager.jsx` is a generic list/search/paginate/create/edit/delete UI driven by a field config (`{key, label, type: text|textarea|number|select|boolean|date, options, required}`). It mirrors `crudFactory.js` on the backend, so a new plain-CRUD module is a field config rather than a bespoke screen. Content Management, Feature Flags, Templates, Legal Pages, IP Whitelist and the read-only log views are all built on it. Pass `readOnly` for log-style screens (hides create/edit/delete).

Screens that legitimately *can't* use it: Support tickets (message thread), API Keys (secret shown once, revoke not edit), Reports, System Health, Integrations.

## Settings structure (per the Access Matrix spec)
The **Settings** sidebar group is the 20-entry structure from `Admin_Panel_Access_Matrix_and_Module_Specification.docx`, in spec order. Three of those entries (**Cities & Locations**, **Vehicle Configuration**, **Pricing & Fees**) intentionally **cross-link to the existing Configurations catalog pages** rather than duplicating them — the Configurations group was kept as its own top-level group because those are daily-use screens and burying them 20 items deep would hurt. So two nav paths reach the same page; that's deliberate, not a bug.

Real functionality lives behind: General, Cities & Locations, Vehicle Configuration, Pricing & Fees, Admin Accounts, Roles & Permissions, Audit Logs, About. The other twelve are `SettingsPlaceholder`s whose backends don't exist — each says what's actually missing rather than pretending.

`/dashboard/administration` was **removed**; its tabs were split into `/dashboard/settings-admin-accounts` and `/dashboard/settings-roles` to match the spec listing them as separate entries.

## Legacy note — the old combined Administration page
- **Admin Users** tab renders `AdminUsersManager` (`_components/AdminUsersManager.jsx`) — full CRUD: list, create, edit (name/email/mobile/role/isActive), delete. This used to be its own page at `/dashboard/access-control`; that route no longer exists — the component moved here and the route/import were removed from the catch-all router.
  - `ROLE_OPTIONS` in that file mirrors `src/utils/adminRoles.js` on the backend (Admin/Super Admin/Support/Accountant) — still not enforced anywhere, just named now.
  - Creating an admin shows a one-time password-reset link in a follow-up popup — there's no forgot-password page in this app, so that link is the only way the new admin can ever set a password and sign in. Don't lose it once the popup closes; the backend can regenerate one but the UI doesn't have a "resend" action yet.
  - Deleting an admin removes their Firebase sign-in too (backend-enforced), and you cannot delete your own account (backend rejects it).
- **Roles & Permissions** tab (combined — used to be two separate placeholder tabs) renders `PermissionMatrix` (`_components/PermissionMatrix.jsx`): roles as rows, modules as columns (one per top-level sidebar section — see `ADMIN_MODULES` in COCARR-BACKEND's `adminPermissions.js`), each cell a No Access/Read/Write `<select>`. Edits are local until "Save Changes" sends the *whole* matrix (`{permissions: [{role, module, access}]}`) to `PUT /admin/permissions` — simpler and more robust than per-cell requests for a fixed ~36-cell grid. **This only defines intended access — nothing reads this matrix to actually gate a request yet.**
- **Activity Logs** tab renders `ActivityLogViewer` filtered to `entityType='Admin'` — same component or `admin/activity-logs` — same underlying feed as Audit's copy, just scoped.
- **Login History** is still a `SettingsPlaceholder` — no backend support exists.

Backend enforces `isActive` in `authenticateAdmin` middleware — deactivating someone now actually blocks their API access, not just a cosmetic flag.

## Audit
Its "Activity Logs" tab renders the same `ActivityLogViewer` as Administration's, but **unfiltered** (all `entityType`s, not just `Admin`) — it'll show more once `logActivity()` gets called from other admin-mutating endpoints (see COCARR-BACKEND's CLAUDE.md). System Logs / Error Logs are still placeholders.

## Static image imports + plain `<img>` don't mix
`import Logo from '@/../public/logo.png'` (used for the sidebar logo and the login-page logo) is a Next.js static image import — it resolves to a `StaticImageData` **object** (`{src, width, height}`), not a URL string. Passing that object straight to a plain `<img src={Logo}>` renders nothing (the browser gets `src="[object Object]"`). Fix is `<img src={Logo.src}>` — done for both occurrences. If you see a missing image anywhere that uses a webpack/Next static import, check for this exact pattern first.

## Header search
`src/app/_components/Header.jsx`'s `SearchInput` used to hardcode `placeholder`/`label` as `'Search Payment'` regardless of which page rendered it — every list page using `search={true}` (Users, Vehicles, Hosts, Offers, Membership, Rides, Dues, Wallet...) showed that same wrong label. Fixed with a `searchPlaceholder` prop (defaults to generic `'Search'`); pass a page-specific one where it matters (done for Users: `'Search users by name, email or phone'`). The actual search plumbing (query param → `Op.like` on the backend) already worked correctly on every page that had it — this was a display-only bug.

**There is no "Refresh from Firebase" button any more**, on either the Users page or Admin Accounts — the bulk Firebase→DB syncs and their endpoints were removed backend-side. Users appear once they complete OTP sign-up; admins are created in the panel. A `downloadExcel`/CSV-export function exists in `users/page.js` but isn't wired to any visible button — dead code, not yet a UI regression since it was never reachable.

## Repo hygiene
`.gitignore` exists (added this session) covering `node_modules/` and `.next/` — both had been committed to git history by mistake previously, which blocked pushes over GitHub's 100MB file-size limit. If a push ever fails with a GitHub LFS/file-size error again, check `git ls-tree -r HEAD --name-only | grep -E '^(node_modules|\.next)/'` first — if non-empty, something force-added a path rather than the ignore rule failing.

**No local Firebase env vars are configured** — `npm run dev` starts fine but crashes on load with `FirebaseError: auth/invalid-api-key`. Can't visually verify changes in a local browser without real `NEXT_PUBLIC_FIREBASE_*` credentials; rely on `next build` + `next lint` instead.

## Known broken/dead code (not yet fixed)
- `src/app/_components/ImageUploader.jsx` renders `<ImageItem>` which is never imported/defined (its only definition in the file is commented out) — crashes with `ReferenceError` wherever this component is actually rendered (several ride/host payment pages import it).
- `src/app/_pages/dashboard/settings/page.js` — leftover/misplaced code, not settings-related (see Nav section above).

## Campaigns + report builder pages
Three pages added, all registered in the catch-all router's `PAGE_COMPONENTS` (`Campaigns`, `DriverReport`, `CustomReport`) — remember that registry step, a page file alone does nothing here.

- `_pages/dashboard/marketing-campaigns/page.js` — list ⇄ builder in one component (`editing === null` means list view). Channel multi-select drives which content blocks render; the audience picker renders itself from the backend's segment `params` descriptors, so new segments need **no change here**. "Preview recipients" shows per-channel reachability (an audience of 500 with 30 email addresses matters *before* sending), and the preview is cleared whenever the segment changes so a stale count never sits next to Send. Sent campaigns render read-only.
- `_pages/dashboard/reports-driver/page.js` and `reports-custom/page.js` — both have client-side CSV export.

`toasters.js` only exports `InfoToast` and `ErrorToast` — there is **no `SuccessToast`**, and importing one is a build-breaking error.

Nav removals per product decision: Operations › Routes, Operations › Live Tracking, Notifications › Email History, Notifications › SMS History. The old Marketing › Campaigns entry (a `push-campaigns`-backed stand-in) and the separate Email/SMS Campaigns stubs were replaced by the single **Email/SMS Campaigns** page.

## Document / bank-detail pages
`_components/DocumentCell.jsx` — shared `StatusPill`, `DocumentImage` (text link + lightbox), **`DocumentThumb`** (visible thumbnail + lightbox), `VerifyActions` and `docState(has, verified)`. Reuse these for any new document screen so the three states (verified / pending / not submitted) stay consistent.

**Use `DocumentThumb`, not `DocumentImage`, on review screens.** Aadhaar and PAN numbers are masked server-side by design, so the reviewer reads the number **off the scan**. A text link tucked under the fields makes the masked text look like the primary data and the document optional — backwards. `DocumentThumb` renders the image up front; `Row` takes a `masked` prop that greys the value and appends "(read from document)" so nobody mistakes a masked field for broken data.

- **User Management › KYC & Documents** (`users-documents`) — one row per user, one column per document showing that document's own review state, then the overall profile status. **It has no inline verify/reject buttons any more**: every decision is made on the user detail page, because a document cannot be judged without the scans, the name match and the provider verdict, and having two screens act on the same document meant neither showed the full picture.
- **Operations › Vehicle RC Details** (`vehicles-rc`) — expandable row showing engine/chassis/maker/colour captured from the RC record.
- **Finance › Host Bank Accounts** (`finance-bank-accounts`) — bank and UPI accounts, name-mismatch flagged in red, manual verification behind a confirm dialog because it marks an account payable without a penny-drop check.

`_pages/dashboard/users-kyc/page.js` is **superseded** by `users-documents` — still imported in the catch-all router but no nav entry points at it.

## User Management section
`src/app/_helpers/userStatus.js` is the **single vocabulary** for profile status — pill colours, labels, what each state means, the filter list, and `allowedActions(status)`. Every screen that shows a status imports from it; they each carried their own map before and drifted. Mirrors `verificationStatus` on the backend User model (`incomplete → pending → active | rejected`, plus `active ⇄ suspended`). NOT the same as a document's own status, which keeps its `verified` value — `DOC_PILL`/`DOC_LABEL` in the same file cover those.

- **Overview** (`user-management`) — the section landing page, and what the sidebar group now opens. Every queue with a live count, each card deep-linking into the customers list with `?status=` pre-applied. All the numbers come from ONE call (`GET /admin/user-management/overview`) because they are meant to agree with each other.
- **Customers** (`users`) — search, status filter chips with counts, status as the last column, row click to the detail page. Reads `/admin/user-verification?status=all`, **not** the older `/user` endpoint: it is the one source returning the profile status and per-document state on the same row. The filter is mirrored into `?status=` so a view can be linked and a back-navigation restores it.
- **User detail** (`users/[id]`) — id + status at the top with a plain-English explanation of what the state means, then profile details with the name match, then a card per document (extracted values, scans, provider verdict, its own verify/reject), then the decision bar. Which of approve/reject/suspend/reactivate appears comes from `allowedActions()`, so a button is never shown for an action the backend would refuse.

### Only Approve activates a profile — and Reject works on active ones too
**A document decision moves the DOCUMENT and nothing else.** The backend used to promote the profile to `active` the moment the last identity document was verified, and reject it when one was turned down; both are gone. Verifying a scan says "this document is good", not "this person may now book" — and the old behaviour let a profile go live without anyone opening the decision screen, with the outcome depending on the order documents happened to be reviewed in. The `document/:docType` response now carries `readyToApprove` so the toast can point at the remaining step instead of announcing an outcome that hasn't happened.

**`allowedActions().reject` covers `pending` AND `active`.** Rejecting an active profile withdraws an approval — for something that came to light after the fact — and the button and dialog say so explicitly ("Reject (withdraw approval)"), because it takes booking away immediately. It is deliberately **not** Suspend: that is an access ban for misconduct and means something quite different to the user.

**Profiles now reach `pending` even when the automatic checks failed.** An OCR or Aadhaar-OTP failure is not the user's fault, so those submissions land in the queue with unverified documents rather than being stranded at `incomplete`. Both the pending copy and the decision panel say so, or the amber document pills read as the user's mistake.

**Route-ordering hazard**: `/dashboard/users/verification` and `/dashboard/users/documents` also match the `/dashboard/users/[id]` regex. This is only safe because `NAV_ROUTE_MAP` is consulted **before** that regex in the catch-all router — a named page under `/dashboard/users` must be declared in navConfig, or it gets treated as a user id.

## Wallet transactions + referral tracing
**Finance › Wallet Transactions** (`finance-wallet-transactions`, registered as `WalletTransactions`) — the points ledger, and the trace behind any row. It sits next to Wallets deliberately: that screen answers "what is this user's balance?", this one answers "why?", which is the question support actually arrives with.

Clicking a row opens a slide-in trace rather than navigating away, so an admin working through a list keeps their place. The trace walks transaction → user → referral → both parties → campaign → every credit that referral produced on either side, with each user a link through to their detail page.

A row with no `referenceType` predates the provenance columns; the panel says so rather than rendering an empty section that looks broken.

**The user detail page gained a Referrals & wallet section** showing both directions — who referred this person, and who they have referred since — each with the wallet transactions it produced, plus the wallet balance and recent history. Both directions matter and are meaningless apart.

**"Unknown" was a backend bug, not a UI one.** `users.name` is NULL for anyone who signed up through the OTP flow (onboarding writes `firstName`/`lastName` and never touches `name`), so every screen reaching for it invented its own fallback. The backend now resolves names centrally — **these screens must render `user.name` from those endpoints as-is and never re-invent a fallback**, or the bug comes back one screen at a time.

Referral status vocabulary is `pending` → `completed`, plus `cancelled`/`fraud`. The legacy `eligible`/`rewarded` spellings still exist on old rows and map to Completed — keep them in any status map you add.

The three loads on the user detail page use `Promise.allSettled`: a referral or wallet lookup failing must not blank out the review screen an admin came there to use.

## Vehicle approvals queue
`_pages/dashboard/vehicles-approvals/page.js` is a real review queue now — it used to just re-render the generic Vehicles list with `approved=false`, so approving meant a trip to the vehicle detail page and rejecting was impossible.

Approve/Reject per card, with photo, RC number, RC-verified state, maker/year and photo count inline. Rejection opens a modal with five one-click common reasons plus free text; **the reason is mandatory** (the backend rejects an empty one too). A previously-rejected vehicle that the host resubmitted shows its old reason so the reviewer has context.
