# Monorepo migration — what is done, and what is deliberately not

`cocarr-platform-web` is now a Turborepo: three independently deployed apps over
one set of shared packages. The **structure and the new shared code exist**; the
**physical move of the existing 169 files has not been done**. This document is
the plan for that move, and the reasoning for splitting it that way.

## Why the move is a separate step

The current tree cannot be built here — the machine is at 100% disk, and three
Next.js apps plus fourteen packages will not install. Relocating 169 files and
rewriting every import **without once running a build** would produce a tree that
looks finished, is broken in ways nobody can see, and is far harder to review
than the sum of its parts. So: everything verifiable was done and verified;
the mechanical bulk is written down here to be executed once a build can run.

Nothing below is blocked on a decision. It is blocked on a working build.

## Done, and verified

| Package | State |
|---|---|
| `@cocarr/auth-sdk` | **Written.** The only package that touches Firebase. Carries over the `whenAuthReady` discipline (a request fired before Firebase restores the session goes out unauthenticated and 401s — this hit `/admin/me` on every cold load). Drops the old `getIdToken(true)` force-refresh on every call, which bought a round-trip to Google per request and nothing else. |
| `@cocarr/api-sdk` | **Written.** Gateway-first: a caller names a service and gets `/v1/core`, `/v1/workspace`, `/v1/platform`… Direct per-service URLs remain as an opt-in downgrade. Normalises both error shapes the platform emits into one. |
| `@cocarr/iam-sdk` | **Written and tested (28 assertions).** Replaces `navConfig.js`, `panels.js` and `permissions.js`. Consumes `GET /v1/platform/me/navigation`. |
| `@cocarr/layouts` | **Written.** `DashboardShell`, a `Sidebar` rendered from IAM data, and `RouteGuard`. Preserves the `h-screen overflow-hidden` + `min-h-0` scroll rules and the single-source expand state. |
| `@cocarr/shared-utils` | **Moved and tested (12 assertions).** `photoUrl` behaviour is byte-for-byte preserved, including both key formats and cross-host re-proxying. |
| `apps/*` | Manifests, `next.config.mjs` (with `transpilePackages` — workspace packages ship as source), and a dashboard layout each. |
| `@cocarr/theme` `ui` `forms` `datagrid` `charts` `icons` `shared-hooks` `shared-types` `notifications` | Manifests and dependency graph only. Their content is the move below. |

## Step 1 — components out of `src/app/_components` (41 files)

| Target | Files |
|---|---|
| `@cocarr/ui` | `Popup`, `FullPopup`, `SlidePopup`, `Loader`, `Status`, `NoticeBar`, `TabGroup`, `PageLayout`, `Header`, `SimpleHeader`, `NavigationTabBar`, `NoAccess`, `SettingsSectionLayout`, `SettingsGroupPanel` |
| `@cocarr/forms` | `Input`, `InputGroup`, `Select`, `SearchInput`, `DateTimePicker`, `ImageUploader`, `SingleImageUploader`, `CropUpload`, `CropperPopup`, `CarImageInfoUploader` |
| `@cocarr/datagrid` | `DataTable`, `Pagination`, `ResourceManager`, `DocumentCell` |
| `@cocarr/charts` | the chart wrappers inside `_pages/dashboard/_components/PlatformOverview.jsx` |
| stays app-local | `AdminUsersManager`, `PermissionMatrix` (admin-web), `RcInfo`, `FaceCompare`, `Map`, `ImageSlider`, `SingleImageHolder` (operations-web) |

`PanelBoot`, `SettingsPlaceholder` and `NotBuiltPage` are **not** moved — see
deletions below.

## Step 2 — pages into apps

The split follows the charter's product ownership, confirmed: the existing
business modules are **Operations**, not Admin.

### apps/operations-web  (41 routes)

| Nav group | Route |
|---|---|
| Dashboard | `/dashboard` |
| User Management | `/dashboard/user-management` |
| User Management | `/dashboard/users` |
| User Management | `/dashboard/users/verification` |
| User Management | `/dashboard/users/documents` |
| User Management | `/dashboard/users/referrals` |
| User Management | `/dashboard/wallet` |
| Hosts | `/dashboard/hosts` |
| Hosts | `/dashboard/finance/bank-accounts` |
| Vehicles | `/dashboard/vehicles` |
| Vehicles | `/dashboard/vehicles/rc` |
| Vehicles | `/dashboard/availability-schedule` |
| Bookings | `/dashboard/rides` |
| Bookings | `/dashboard/operations/trips` |
| Bookings | `/dashboard/operations/damages` |
| Bookings | `/dashboard/support/complaints` |
| Finance | `/dashboard/payments` |
| Finance | `/dashboard/dues` |
| Finance | `/dashboard/finance/refunds` |
| Finance | `/dashboard/finance/settlements` |
| Finance | `/dashboard/finance/invoices` |
| Marketing | `/dashboard/offers` |
| Marketing | `/dashboard/membership` |
| Marketing | `/dashboard/marketing/campaigns` |
| Marketing | `/dashboard/marketing/push` |
| Marketing | `/dashboard/marketing/referrals` |
| Marketing | `/dashboard/marketing/referral-campaigns` |
| Marketing | `/dashboard/marketing/referral-analytics` |
| Support | `/dashboard/support` |
| Support | `/dashboard/support/feedback` |
| Reports | `/dashboard/reports` |
| Reports | `/dashboard/reports/customer` |
| Reports | `/dashboard/reports/driver` |
| Reports | `/dashboard/reports/performance` |
| Reports | `/dashboard/reports/custom` |
| Reports | `/dashboard/reports/exports` |
| Master Data | `/dashboard/settings/cities` |
| Master Data | `/dashboard/settings/brands` |
| Master Data | `/dashboard/settings/pickup-points` |
| Master Data | `/dashboard/settings/protection-plan` |
| Master Data | `/dashboard/settings/membership-types` |

### apps/admin-web  (16 routes)

| Nav group | Route |
|---|---|
| Administration | `/dashboard/admin-accounts` |
| Administration | `/dashboard/teams-access` |
| Administration | `/dashboard/admin-activity` |
| Administration | `/dashboard/admin-logins` |
| Administration | `/dashboard/audit` |
| Settings | `/dashboard/general-settings` |
| Settings | `/dashboard/settings-business` |
| Settings | `/dashboard/settings-payments` |
| Settings | `/dashboard/settings-maps` |
| Settings | `/dashboard/settings-tax` |
| Settings | `/dashboard/security-settings` |
| Settings | `/dashboard/settings/preferences` |
| Settings | `/dashboard/policies` |
| Settings | `/dashboard/integrations` |
| System | `/dashboard/system-health` |
| System | `/dashboard/developer/queue` |

### apps/workspace-web  (6 routes)

| Nav group | Route |
|---|---|
| Employees | `/dashboard/workspace/employees` |
| Organization | `/dashboard/workspace/departments` |
| Organization | `/dashboard/workspace/designations` |
| Organization | `/dashboard/workspace/teams` |
| Recruitment | `/dashboard/workspace/candidates` |
| Access Requests | `/dashboard/workspace/access-requests` |

Routes not in `navConfig` (dynamic detail pages such as `/dashboard/users/[id]`)
follow their parent section. They are the reason `canOpenRoute` must answer
`null` rather than `false` for an unknown route.

## Step 3 — deletions, and why each is safe

| Deleted | Replaced by |
|---|---|
| `_helpers/navConfig.js` (362 lines) | the IAM navigation payload. It was extracted into `cocarr-authorization-service/src/seeds/taxonomy.js` first, so no screen is lost — 17 groups, 63 pages, 21 modules, all seeded. |
| `_helpers/panels.js` + `NEXT_PUBLIC_PANEL` | runtime permissions. Each app is now its own deployment, so the build-time split has nothing left to do. |
| `_helpers/permissions.js` | `@cocarr/iam-sdk`. Same discipline — the client never decides, it renders what the server filtered. |
| `[[...slug]]/page.js` (598 lines) | real Next.js file-based routing. The hand-rolled catch-all existed to serve every module from one deployment; three apps do not need it. **This removes the "add a page and forget the `staticRouteMap` entry" trap entirely.** |
| `_pages/rootOnly.js` + the webpack dead-branch elimination | app separation. Root-only screens live in `admin-web` and are not in the other two bundles at all — which is what the `require()`-inside-an-inline-`if` trick was straining to approximate. |
| `_helpers/workspaceAxios.js` | `@cocarr/api-sdk`. |

> The build-time panel machinery was well-engineered and is being removed on
> purpose. Its own documentation warned that hoisting the condition out of the
> `if` silently ships the root-only screens — a correct mechanism guarded by a
> footgun. Separate deployments make the guarantee structural instead.

> **Expected until step 2 lands:** `/dashboard` sends a person to the first
> screen their permissions allow, and for most roles that route has no page file
> in the new apps yet, so it 404s. That is the redirect working, not a bug — the
> destination arrives with the page move.

## Step 4 — verification, once a build can run

1. `npm install` at the root; `npx turbo run build` — all three apps.
2. Every app boots to a sidebar rendered **only** from `/me/navigation`.
3. `grep -r "navConfig\|panelHasModule\|NEXT_PUBLIC_PANEL" apps/ packages/` returns nothing.
4. Seed IAM (`node scripts/seedTaxonomy.js --confirm`), sign in as each seeded
   role, and confirm the sidebar matches the old panel for the same person.
   **This is the acceptance test for the whole migration** — the taxonomy was
   generated from the real nav precisely so this comparison is meaningful.
5. Per-app deploys: `admin.cocarr.com`, `workspace.cocarr.com`, `ops.cocarr.com`,
   each with `NEXT_PUBLIC_GATEWAY_URL=https://api.cocarr.com`.
