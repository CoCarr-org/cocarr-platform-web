# Splitting the admin panel into per-team portals

One repo, one codebase, many deployments.

**Now:** `root.cocarr.com` (super admin) + `admin.cocarr.com` (every other team).
**Later:** `root.cocarr.com` (super admin), `admin.cocarr.com` (the Admin module),
and a subdomain per team.

---

## 1. What the repo does today

Verified against current `develop`. These facts constrain every option below.

| Thing | Where | Why it matters |
|---|---|---|
| **One catch-all router** | `src/app/[[...slug]]/page.js` (559 lines) | No file-based routing. Pages resolve by hand from `PAGE_COMPONENTS`, `NAV_ROUTE_MAP` (derived from navConfig) and `staticRouteMap`. The single place "which pages exist" can be decided. |
| **Every page is statically imported** | ~120 imports at the top of that file | Every page's JS is in every bundle. Central to §8. |
| **13 nav groups, each tagged with a `module`** | `_helpers/navConfig.js` | The keys already match the backend's RBAC module vocabulary. **This is the seam.** |
| **Dashboard is a group with 5 sub-pages** | navConfig lines 23–32 | Overview, Analytics, Live Activity, Notifications, Quick Actions. Collapsing this is §6. |
| **No client-side permission gating** | `Sidebar.jsx`, navConfig | All 13 groups render for everyone. `authSlice.role` is never populated — nothing calls an `/admin/me`. Admins discover their access by collecting 403s. |
| **Teams are real, seeded, and already the RBAC primitive** | `adminTeam`, `adminTeamLevel`, `adminTeamPermission`, `adminTeamService` (375 lines) | See §2 — this is the most important finding in the document. |
| **Backend RBAC enforced by default** | `requirePermission()`, `RBAC_ENFORCE !== 'false'` | The only thing actually protecting anything. |
| **Build is vanilla** | `next.config.mjs` | `next build`/`next start`. No `basePath`, no `output: export`, no middleware, no in-repo deploy config. |

---

## 2. The important finding: teams already exist, fully built

The earlier draft of this plan was written around the ten `admins.role` integers.
That was the wrong primitive, and the repo already knows it.

`adminTeamService.js` seeds **seven teams** — `super-admin`, `admin`,
`customer-support`, `operations`, `finance`, `marketing`, `developer` — each with
**levels** (Manager / Specialist / Agent; Administrator for super-admin) and a
row per `(team, level, module)` carrying `canCreate/canRead/canUpdate/canDelete`.
`admins.teamId` and `admins.teamLevelId` link an admin to theirs, a boot
migration maps legacy `role` integers onto the matching team, and
`resolvePermission(admin, module)` already answers the question.

**This is exactly the primitive the portal needs**, and it removes the biggest
risk from the earlier draft: that plan proposed drawing panels along role lines
while the backend's own notes flag five of the ten roles as `DERIVED` — somebody's
reading of a one-line description rather than transcribed from the spec. Teams
are seeded deliberately and edited by a Super Admin at runtime, so they are a
sound thing to hang a portal on.

**Everything below is team-driven. Roles are legacy.**

---

## 2b. Architectural review — four things that must be fixed first

The whole plan rests on one premise: **team + level determines access.** Reviewing
the permission code against that premise, it does not currently hold. There are
three ways an admin can end up with more access than their team says, and one way
a lookup failure hands out access for free.

These are not public-internet vulnerabilities — everything is behind Firebase
admin auth. They are **privilege escalation between staff, and silent
misconfiguration**, which is exactly the risk model a per-team portal is supposed
to reduce. Shipping the split on top of them would advertise a separation the
backend does not enforce.

All four are in `permissionMiddleware.js` / `adminTeamService.resolvePermission`.

### ① `null` is overloaded, and denial silently becomes a grant — **critical**

`resolvePermission` returns `null` on five different paths:

```js
if (!admin) return null;                        // no admin row
if (admin.role === SUPER_ADMIN) return FULL;    // (see ②)
if (!admin.teamId) return null;                 // not migrated — legitimate legacy
if (!team || !team.isActive) return null;       // team deleted or DEACTIVATED
if (!levelId) return null;                      // no level, or level deleted
```

…and the middleware treats every one identically:

```js
if (!permission) permission = await getEffectivePermission(admin.role, module);
```

Only the third is a legitimate legacy case. The other two are *denials* — and
they are converted into a grant from the legacy role matrix.

**Concretely: deactivating a team does not remove its members' access.** It
silently reverts them to whatever their legacy `role` integer allows, which for a
Platform Administrator is CRUD on users, hosts, vehicles, bookings, support,
marketing and CMS. The one control a Super Admin would reach for to cut off a
team does close to nothing. Same for deleting a level.

**Fix:** make resolution *total* and the source explicit.

```js
// Returns { source, permissions } — never null, and never ambiguous.
//   'bootstrap' → break-glass account
//   'team'      → resolved from team + level (may be all-false; that is a DENY)
//   'legacy'    → ONLY when the admin row exists and teamId is null
//   'none'      → explicit deny
async function resolveAccess(admin) { … }
```

Legacy applies only to the un-migrated case. An inactive team, a missing level or
a missing permission row is an **explicit deny**, not a fallback.

### ② The legacy `role` column overrides the team system — **critical**

```js
if (admin.role === ADMIN_ROLES.SUPER_ADMIN) return FULL_ACTIONS;   // line 3
…
if (team.key === 'super-admin') return FULL_ACTIONS;               // line 8
```

Line 3 runs **before any team lookup**, so `admins.role === 2` grants everything
regardless of team. The boot migration maps `role → teamId` but **never clears
`role`**, so every migrated super admin still carries it.

Move someone from Super Admin to Operations and they keep full access. Nothing in
the Teams & Access UI hints at it, because that screen edits teams — the override
is a column it does not show.

**In the portal world this is the escalation path**: that person signs into
`admin.cocarr.com`, sees an Operations-shaped UI, and has root-level API
access behind it.

**Fix:** delete line 3. Line 8 already covers super admin *via the team*, which is
the primitive we are standardising on. Before removing it, confirm every
`role === 2` admin has `teamId` pointing at `super-admin` — otherwise the fix
locks them out. That check is a one-line query and belongs in the same PR.

### ③ No `admins` row means full access — **high**

`authenticateAdmin` sets `req.admin = null` when the Firebase user has no DB row
and lets the request through. `requirePermission` then does:

```js
if (!admin) { …; return next(); }   // allowing (no role to check)
```

So **anyone who can create a user in the admin Firebase project has unrestricted
API access** — no team, no level, no panel binding. Both comments say this is
deliberate ("sync hasn't caught up"), but the bulk Firebase→DB sync was removed;
rows are now created by `createAdmin`, so a Firebase user without a row is no
longer a normal transitional state.

**Fix:** deny when there is no admin row. The bootstrap-email break-glass already
protects the empty-table case, which is what this fallthrough was really for.
Check for orphaned Firebase users first.

### ④ Fail-open on lookup error — **medium**

```js
} catch (error) {
  console.error('[rbac] permission check failed, allowing request:', error);
  return next();
}
```

A database blip during permission resolution grants the request. Combined with ①
and ③ the system fails open in three separate places.

**Fix:** fail closed with a 503. An admin retrying a failed action is a much
better outcome than an unchecked write. Keep the loud log.

### What this changes about the plan

**These land before the portal split, not with it** — the split's premise is that
team+level is authoritative, and today it isn't. They are also worth doing on
their own merits: ② and ③ are live escalation paths right now, with or without
any portal.

They also make `/admin/me` (§9a) straightforward. Once `resolveAccess` is total
and unambiguous, the endpoint is one call to it, and the UI cannot diverge from
the middleware because both read the same function.

---

## 3. Two different mechanisms — don't confuse them

This is the thing most likely to be got wrong, so it is worth stating up front.

| | Chooses | When | How |
|---|---|---|---|
| **Panel split** | which pages exist in this *deployment* | **Build time** | `NEXT_PUBLIC_PANEL` env var |
| **Team scoping** | which pages this *person* sees | **Run time** | the signed-in admin's team + level |

`admin.cocarr.com` is **one build** containing every non-super-admin module. What
an Operations user sees versus a Finance user is decided at runtime from their
team. Only the super-admin/everything-else division is a build-time split.

That is why Phase 2 (a subdomain per team) is cheap later: the runtime team
scoping is already doing the work, and splitting the build is then just narrowing
what each deployment ships.

---

## 4. Naming, and the hierarchy — DECIDED

The hazard this section used to warn about has been designed out rather than
mitigated. `admin.cocarr.com` never changes meaning, because super admin was
never put there.

| Site | Host | Tier | Who |
|---|---|---|---|
| Super admin | **`root.cocarr.com`** | 0 | the `super-admin` team only |
| Everything else | **`admin.cocarr.com`** | 1 | all other teams, scoped at runtime |
| Operations | `ops.cocarr.com` | 2 | operations |
| Customer Support | `support.cocarr.com` | 2 | customer-support |
| Finance | `finance.cocarr.com` | 2 | finance |
| Marketing | `growth.cocarr.com` | 2 | marketing |
| Developer | `developer.cocarr.com` | 2 | developer |

Tier 2 is declared and dormant. Every host stays under `*.cocarr.com` so one
wildcard cert and one Firebase authorised-domain list covers all of them.

> **What changed from the earlier draft.** Super admin was going to live at
> `admin.` and move to `root.` at Phase 2, with a bookmark-breaking rename
> landing on the most privileged accounts in the system. Option 1 in the old
> text — stand `root.` up immediately — is what was built. `admin.` means the
> combined non-super-admin panel from day one and keeps meaning that forever, so
> there is no migration to sequence and no interstitial to write.

### Access is top-down, never upward

Every team has a **home panel** — the tier it belongs to. A team may use its own
panel and anything **below** it, and nothing above it:

```
super admin  (home root,    tier 0) → root, admin, and every module panel
finance      (home admin,   tier 1) → admin, and the finance module panel
finance      (home finance, tier 2) → finance only; admin is now above them
```

The upward denial is absolute and is evaluated first, alone, in
`adminPanels.check` — before the sibling question, so no later branch can reach
past it. Everything after it answers *"is this panel yours?"*, which is a
different question from *"is this panel above you?"*.

**Sibling panels are also closed**: a Finance admin cannot open
`ops.cocarr.com`, even though both sit at tier 2. Without that, the whole
Operations menu would render for them and then every call behind it would 403 —
a panel that looks broken rather than one that says no. Root is the exception:
it reaches down into panels that do not list it, because that is what root is.

### The two-step cutover, and why it is two steps

Moving a team onto its own host is deliberately split, and the order matters:

1. **Deploy the host.** `ADMIN_PANEL_ORIGINS=…,ops=https://ops.cocarr.com`.
   Operations can now use *both* `admin.` and `ops.`, because their home is
   still `admin` (tier 1) and tier 1 reaches down into tier 2. Nothing is taken
   away, so a broken build is not an outage.
2. **Move their home.** `ADMIN_PANEL_HOMES=operations=ops`. `admin.` is now
   above them and closes. This is the step that bites, and it is one env var —
   so undoing a bad cutover is one env var too.

**Setting step 2 without step 1 would lock out an entire team**: a home they
cannot reach, and an admin panel that now refuses them. `HOME_OVERRIDES`
therefore refuses to apply a home whose panel has no origin or key configured,
and logs why. It also refuses a home whose panel does not list that team, which
catches the copy-paste version of the same mistake.

### Separate logins

Each panel is its own sign-in, not merely its own URL. The login screen names
the panel above the password box, and on submit it calls `/admin/me` before
navigating — a wrong-panel account is signed straight back out with a sentence
saying where to go, instead of landing on a dashboard that then refuses to load.

That check is **for the person, not for the boundary**. All panels share one
Firebase project and one API, so a token minted anywhere is valid everywhere;
the binding is re-checked on every request, and only the server-side check
counts. See §9.

---

## 5. Be clear about what this buys

**It gives you:** separate blast radius, independent release cadence, a smaller
and less confusing UI per team, and a clean place to put network controls later
(IP allowlist on `admin.`/`root.` only).

**It does not give you access control.** Every panel talks to the same API on the
same origin. A Support user signing in at `admin.cocarr.com` can still open dev
tools and call `/admin/user-verification/:id/approve`. The only thing stopping
them is `requirePermission` on the server.

So the backend work in §9 lands **with** Phase 1, not after it. Splitting only
the frontend makes the panel *look* segregated without changing who can do what,
which is worse than not splitting — because everyone will assume otherwise.

---

## 6. A dashboard per team, composed by level

**There is no universal dashboard.** Operations and Finance do not care about the
same numbers, and a single page trying to serve both becomes a wall of tiles most
of which are noise to whoever is looking at it. Each team gets its own dashboard;
within a team, **level** decides how much of it is actionable.

What stays from the old design: Dashboard is **one route** (`/dashboard`), the
landing page of every portal, with no children and no expandable nav group. The
five existing sub-pages are folded in or rehomed:

| Sub-page | Disposition |
|---|---|
| Overview | Absorbed into the per-team dashboards |
| Analytics | Moves under **Reports** |
| Live Activity | A block, available to teams that want it |
| Notifications | A block |
| Quick Actions | A block, and the clearest example of level-dependence |

Nothing is deleted — the components become blocks. Keeps it reversible.

### The composition model

One route, one page component, a **registry of blocks**, and a **per-team
layout** naming which blocks that team gets:

```js
// _dashboard/blocks.js — every block declares what it needs. A block is never
// rendered unless the viewer holds that permission, so the layout below can
// stay a plain list and never repeat a permission rule.
export const BLOCKS = {
  bookingsQueue:   { module: 'bookings', action: 'read',   component: BookingsQueue },
  bookingsActions: { module: 'bookings', action: 'update', component: BookingsActions },
  vehicleApprovals:{ module: 'vehicles', action: 'update', component: VehicleApprovals },
  kycQueue:        { module: 'users',    action: 'update', component: KycQueue },
  payoutsDue:      { module: 'payouts',  action: 'read',   component: PayoutsDue },
  ticketsOpen:     { module: 'support',  action: 'read',   component: TicketsOpen },
  liveActivity:    { module: 'dashboard',action: 'read',   component: LiveActivity },
  …
}

// _dashboard/layouts.js — what each team's dashboard is made of, in order.
export const TEAM_DASHBOARDS = {
  operations:        ['bookingsQueue', 'vehicleApprovals', 'liveActivity', 'bookingsActions'],
  finance:           ['payoutsDue', 'refundsPending', 'settlementsDue', 'walletActivity'],
  'customer-support':['ticketsOpen', 'disputesOpen', 'recentBookings'],
  marketing:         ['campaignPerformance', 'referralFunnel', 'offersActive'],
  admin:             ['kycQueue', 'hostApprovals', 'vehicleApprovals', 'liveActivity'],
  developer:         ['systemHealth', 'webhookFailures', 'apiErrors'],
  'super-admin':     ['platformSummary', 'kycQueue', 'payoutsDue', 'systemHealth'],
}
```

**Level falls out of this for free.** `bookingsActions` needs
`bookings.update`, so an Operations **Agent** (read-only) gets the queue without
the action row, and a **Manager** gets both — from the same layout, with no
per-level branching anywhere. That is the whole reason blocks declare a
permission rather than the layout declaring a level: levels are editable at
runtime by a Super Admin, and a layout keyed on level would silently go stale the
moment someone edits the grid.

**A team with no layout** gets a default built from whatever modules it can read —
so a Super Admin creating a new team gets a working dashboard immediately,
without a deploy. The named layouts are curation on top, not a requirement.

### Design rules

- **Attention first.** The top strip is only things a human must act on. Merely
  interesting counts belong in blocks. If nothing needs action it says so in a
  line — its absence would read as a loading bug.
- **Every number is a link** to the filtered list that produced it. A count you
  cannot click is a dead end.
- **Scoping happens on the server.** `GET /admin/dashboard/summary?blocks=…`
  returns only the blocks the caller may see, computed per block (§9b). The client
  asks for its team's layout and renders what comes back — it never decides what
  to hide, or it becomes a second, divergent copy of the permission matrix.
- **An empty dashboard is a real state**, and the honest message is "your team has
  access to one area", not an empty grid.

```
┌────────────────────────────────────────────────────────────┐
│  Operations Portal                          Priya · Manager │
│  Good morning. Here's what needs you today.                 │
├────────────────────────────────────────────────────────────┤
│  ⚠ 12 bookings need attention   ·   3 disputes open         │  attention strip
├──────────────────┬──────────────────┬──────────────────────┤
│ Bookings         │ Vehicle approvals│ Live activity         │  team's blocks,
│ 48 today         │ 7 pending      → │ … feed …              │  in layout order
│ 12 need action → │ 2 rejected     → │                       │
└──────────────────┴──────────────────┴──────────────────────┘
   ↑ Agent sees this same page without the action controls,
     because those blocks need `update` and they hold `read`.
```

---

## 7. Team identity in the UI

Under the Cocarr logo in the sidebar, show the team the signed-in admin belongs
to — name plus icon:

```
   ▣  cocarr
   ─────────────────
   🚗  Operations
       Portal
```

- **Name** comes from `adminTeam.name`, so a Super Admin renaming a team renames
  it everywhere with no deploy.
- **Icon** is per team. `adminTeam` has no icon column — add one (`icon`, a
  string key from the existing Ionicons set the sidebar already uses), seeded with
  a sensible default per team and editable in Teams & Access. Falling back to a
  generic badge when unset means the column can ship before anyone fills it in.
- **The word "Portal"** distinguishes it from `admin.`/`root.`, which shows
  "Console" instead. Two people screen-sharing should never have to ask which
  site they are looking at.
- **Super admins see their team too** — "Super Admin · Console". Consistency
  costs nothing here.
- Also show **the admin's own name and level** ("Priya · Manager") in the
  dashboard header. Level determines what they can do, so it should be visible
  without opening a settings page.

---

## 8. The mechanism

### Panel manifest — `src/app/_helpers/panels.js`

```js
// A panel is a set of RBAC module keys. Keys match navConfig's `module` field
// and the backend's vocabulary, so nothing else has to know panels exist.
//
// `modules: '*'` means "everything navConfig declares" — used by root so
// the super-admin build stays exactly what ships today. Listing its modules
// explicitly would mean a new module silently missing from root until
// somebody remembered to add it here, which is the wrong default for the panel
// that exists to administer everything.
export const PANELS = {
  root: {                             // root.cocarr.com — tier 0
    label: 'Console',
    teams: ['super-admin'],           // team KEYS, not role integers
    modules: '*',                     // UNCHANGED from today's panel
  },
  admin: {                            // admin.cocarr.com — tier 1, common login
    label: 'Portal',
    teams: ['admin', 'customer-support', 'operations',
            'finance', 'marketing', 'developer'],
    modules: ['dashboard', 'users', 'hosts', 'vehicles', 'bookings', 'payments',
              'payouts', 'support', 'marketing', 'cms', 'reports'],
  },
}

export const CURRENT = PANELS[process.env.NEXT_PUBLIC_PANEL || 'portal']
```

### The three layers of gating

Team alone is not enough — **level** decides what you can *do* within a module,
and today the UI ignores both. The seeded levels are:

| Level | Rank | Grid |
|---|---|---|
| Manager | 3 | the team's full grid |
| Specialist | 2 | same, minus **delete** |
| Agent | 1 | **read only** |
| Administrator (super-admin only) | 3 | everything |

So three layers, applied in order:

| Layer | Question | Source | Effect |
|---|---|---|---|
| **1. Panel** | does this page exist in this build? | `NEXT_PUBLIC_PANEL` | build time |
| **2. Module read** | may this person see this area? | `team + level → canRead` | which nav groups **and pages** appear |
| **3. Action** | may this person do this? | `team + level → create/update/delete` | which **buttons** appear |

**Layer 3 is the one that is entirely missing today** and the one users will
notice most. An Agent currently sees Approve, Reject and Suspend on the user
detail screen, clicks one, and gets a 403 — the same "discover your access by
collecting errors" problem as the nav, one level down.

#### Layer 2 — pages, not just groups

Gate on **`page.module ?? group.module`**. navConfig already overrides the module
per page in several places — Finance contains Wallets (`users`), Taxes
(`settings`) and Host Bank Accounts (`payouts`) alongside its own `payments`
pages — so gating a group solely on the group's own module would both hide pages
someone can legitimately see and show groups containing nothing they can open.

Follows from that: **a group renders only if at least one of its pages does.**
Compute the pages first, then decide the group.

#### Layer 3 — a `can()` helper, wired once where it counts

```js
const { can } = usePermissions()
can('users', 'update')   // → boolean
```

Two places give most of the coverage for little work:

- **`ResourceManager`** backs Content Management, Feature Flags, Templates, Legal
  Pages, IP Whitelist and the log views. Wiring create/edit/delete there once
  gates all of them. It already has a `readOnly` prop — this is the same idea,
  derived rather than passed.
- **The bespoke decision screens** — user detail (Approve/Reject/Suspend/document
  verify), vehicle approvals, damage claims, settlements. These are where a
  wrongly-shown button is most costly, so they are worth doing by hand.

Rule: **hide, don't disable.** A disabled Approve button invites someone to ask
why, and the honest answer ("your level cannot do this") is better delivered by
its absence plus the level shown in the header (§7). Disabling is for *temporarily*
unavailable, not *never yours*.

#### And a deep link to something you cannot read

Renders the "no access" page — never a fallthrough to Dashboard, which is what
unknown paths do today.

---

**In short: visible nav = panel modules ∩ pages whose module the admin's
team+level can read.** The panel narrows what the build contains; team+level
narrows what the person sees and does.

**Root is today's panel, unchanged.** `modules: '*'` plus a super-admin
team that reads everything means the intersection is the whole nav — so
`admin.cocarr.com` is a rename and a redeploy, not a rebuild. All the genuinely
new work is on `portal.`, which halves the Phase 1 risk: if the portal is wrong,
super admins are unaffected.

### Why Phase 2 is then a config change, not a rewrite

This is the property to protect, so it is worth being explicit about what makes
it true. Splitting Operations onto its own host later requires:

```js
  operations: {
    label: 'Operations',
    teams: ['operations'],
    modules: ['dashboard', 'bookings', 'vehicles', 'hosts', 'users'],
  },
```

…plus a deployment target with `NEXT_PUBLIC_PANEL=operations`. **No component
changes, no routing changes, no nav changes.** That holds because:

- The nav, the router map and the sidebar all derive from one filtered
  `navConfig`, so narrowing the filter narrows everything downstream at once.
- Team scoping already runs at runtime, so a per-team build is only ever
  *narrowing what is already being narrowed* — never introducing a new concept.
- Panels are keyed on the same module vocabulary as the backend's RBAC, so
  there is no second taxonomy to keep in sync.

The one thing that does **not** come free is cross-module links (§12) — a link
from Finance to a user detail page becomes cross-host. Introduce a
`hostFor(module)` helper with the first such link and use it for all of them.
Until Phase 2 it resolves to a relative path and costs nothing.

`navConfig` exports the filtered list, and both `Sidebar` and `NAV_ROUTE_MAP`
already derive from it — so both follow with no further change. This is why the
existing `module` tagging is worth so much.

### The static-import problem

`PAGE_COMPONENTS` statically imports ~120 page components, so the bundler cannot
drop anything. Filtering the nav alone leaves `admin.cocarr.com` still carrying
the Roles & Permissions bundle.

Convert to `next/dynamic`:

```js
const PAGE_COMPONENTS = {
  SettingsRoles: dynamic(() => import('../_pages/dashboard/settings-roles/page')),
  …
}
```

**Do this as its own PR, before the split**, so a bundle regression is
attributable. It is worth doing regardless — eagerly importing 120 pages is why
first paint is slow today.

### Routing misses

A path this panel does not have must render "This section lives on
admin.cocarr.com" with a link — **not** fall through to Dashboard, which is what
unknown paths do today and would be baffling.

---

## 9. Backend work — the part that matters

**9a. `GET /admin/me`.** Returns `{id, name, email, team: {key, name, icon},
level: {key, name, rank}, permissions: {module: {create, read, update, delete}},
enforced}`. Nothing like it exists today, which is why `authSlice.role` is always
null. Everything in this plan depends on it.

> #### ⚠ It must reuse `requirePermission`'s resolution chain, not reimplement it
>
> `permissionMiddleware` resolves in **three tiers**, and the UI hiding things the
> server allows is just as broken as the reverse:
>
> 1. **Bootstrap email → always allowed.** If `/admin/me` returns a computed grid
>    instead, the break-glass account gets an empty sidebar on the very panel it
>    exists to rescue.
> 2. **`teamService.resolvePermission(admin, module)`** — the team/level grid.
> 3. **`getEffectivePermission(admin.role, module)`** — the legacy role matrix,
>    used when `resolvePermission` returns null because the admin has **no
>    `teamId`** (not yet migrated onto a team).
>
> Tier 3 is the trap. An un-migrated admin gets `null` from `resolvePermission`,
> so a naive `/admin/me` reports no permissions — the UI hides everything while
> the server happily serves their requests. They see an empty panel and file a
> bug that looks nothing like its cause.
>
> **Extract the chain into one `effectivePermissions(admin)` and have both
> `requirePermission` and `/admin/me` call it.** Two implementations of this will
> drift, and the failure is silent in both directions.
>
> Also return `enforced` (`RBAC_ENFORCE`). In dry-run the server allows
> everything and only logs — so the UI must not gate strictly, or dry-run stops
> being a safe way to debug a lockout and becomes its own lockout. Decide this
> explicitly (§13).

One call, returning the whole module map — not a request per module.

**9b. `GET /admin/dashboard/summary`.** Returns only the blocks the caller can
read. Server-side scoping, per §6.

**It must not be gated on a single module.** `requirePermission('dashboard','read')`
would let anyone who can see a dashboard receive counts aggregated from modules
they cannot open — the endpoint would leak exactly what the portal exists to
partition. Gate `dashboard.read` for access to the endpoint, then compute each
block only if the caller has `read` on **that block's** module.

**9c. Bind teams to panels, server-side, per request.**

**It cannot be done at login.** Every panel uses the same Firebase admin project
and the same API, so a token minted at `admin.cocarr.com` is a valid token at
`admin.cocarr.com` — there is nothing panel-specific about it. Checking the panel
only at sign-in would be checked once and bypassed thereafter.

So the check belongs in `authenticateAdmin`, on every request: resolve the
caller's team, resolve which panel this request claims to come from, and reject
the mismatch.

Strongest practical version: each deployment carries a **per-panel API key** in a
header, checked against the team's allowed panels. Weaker but zero-config:
`Origin` against the manifest — stops casual cross-panel use, not a determined
caller with curl. Either way it is a **second** control; §2b is what makes the
first one trustworthy.

**9d. Lock CORS** to the exact panel origins.

**9e. Add `adminTeam.icon`** (§7) and seed it.

**9f. Keep the break-glass.** The bootstrap super admin must always reach the
root panel even if permissions are misconfigured. It works that way today; don't
lose it in the panel binding.

---

## 10. Phase 1, in shippable order

Each step is independently revertable, and the early ones are worth having on
their own even if the split is postponed.

| # | Step | Repo |
|---|---|---|
| 0a | **Make permission resolution total** — `resolveAccess(admin)`, explicit deny, legacy only for un-migrated (§2b①) | backend |
| 0b | **Drop the legacy `role === SUPER_ADMIN` override**, after verifying every such admin is on the `super-admin` team (§2b②) | backend |
| 0c | **Deny when there is no `admins` row**, after checking for orphaned Firebase users (§2b③) | backend |
| 0d | **Fail closed on permission-lookup error** — 503, not allow (§2b④) | backend |
| 1 | `GET /admin/me` (9a) — now one call to `resolveAccess` | backend |
| 2 | Populate `authSlice` from it — team, level, permissions | admin |
| 3 | **Gate the nav on team+level `read`** (layer 2). Still one host. Independently fixes today's "everyone sees everything and learns by 403" | admin |
| 3b | **Gate actions on team+level create/update/delete** (layer 3) — `ResourceManager` first, then the decision screens | admin |
| 4 | Team identity in the sidebar (§7) + `adminTeam.icon` | both |
| 5 | Collapse Dashboard to one page; move Analytics under Reports (§6) | admin |
| 6 | `GET /admin/dashboard/summary` + wire the dashboard blocks | both |
| 7 | `panels.js` + filtered nav. Default `NEXT_PUBLIC_PANEL=admin`, so nothing changes yet | admin |
| 8 | Dynamic imports in `PAGE_COMPONENTS` (own PR, measured) | admin |
| 9 | "Wrong panel" page | admin |
| 10 | Team→panel binding + CORS (9c, 9d) | backend |
| 11 | Point `root.cocarr.com` at the existing build with `NEXT_PUBLIC_PANEL=root`, and `admin.cocarr.com` with `NEXT_PUBLIC_PANEL=admin`. Two builds of one repo | infra |
| 12 | Stand up `admin.cocarr.com`. Cut over, announce | infra |

**Steps 0a–0d come first and are independently valuable.** ② and ③ are live
escalation paths today, with or without any portal; ① means the Super Admin's
"deactivate team" control does almost nothing. None of them require the split, and
the split should not ship without them — its whole premise is that team+level is
authoritative.

Steps 1–6 then deliver most of the visible value — team-aware nav, team branding,
a real dashboard — **before** any hosting change. If the split stalls, that work
still stands.

---

## 11. Deployment

Same repo, same branch, N targets. Per target:

```
NEXT_PUBLIC_PANEL=root|admin|ops|support|finance|growth|developer
NEXT_PUBLIC_PANEL_KEY=<this panel's shared key, matching ADMIN_PANEL_KEYS>
NEXT_PUBLIC_HOST_ROOT, NEXT_PUBLIC_HOST_ADMIN, …   ← only needed once >1 host exists
NEXT_PUBLIC_BASE_URL=<same API for all>
NEXT_PUBLIC_FIREBASE_*=<same admin Firebase project for all>
REACT_APP_BASE_URL, REACT_APP_UPLOAD_URL   ← easy to forget, see below
```

`NEXT_PUBLIC_PANEL` **defaults to `admin`**, not root. A target that forgets the
variable gets the less privileged build — the failure that is merely wrong rather
than the one that publishes the super-admin panel at an unintended hostname.

`NEXT_PUBLIC_PANEL_KEY` **is not a secret**: `NEXT_PUBLIC_*` is inlined into the
client bundle, so anyone who opens the site can read it and replay it with
`curl` — the exact caller it was meant to distinguish from a browser. In this
mode it stops someone pointing a browser at the wrong panel and nothing more.

For a key `curl` cannot produce, turn on the **gateway**:

```
NEXT_PUBLIC_PANEL_GATEWAY=true    # client: authAxios targets /api/panel
PANEL_KEY=<secret>                # server ONLY — no NEXT_PUBLIC_ prefix
PANEL_GATEWAY_TARGET=<API base>   # defaults to NEXT_PUBLIC_BASE_URL
```

The browser then talks to its own origin and `src/app/api/panel/[...path]/route.js`
adds the key server-side, so the value never reaches the client. A request
bearing a valid root key must have passed through the root deployment. It costs
one hop on every admin request, which is why it is opt-in rather than the
default. Pair either mode with the backend's `ADMIN_PANEL_KEYS`.

And on the API, once the hosts exist:

```
ADMIN_PANEL_ORIGINS=root=https://root.cocarr.com,admin=https://admin.cocarr.com
ADMIN_PANEL_KEYS=root=<secret>,admin=<secret>
ADMIN_PANEL_HOMES=operations=ops          # step 2 of a cutover — see §4
```

All three are **off by default**. Until `ADMIN_PANEL_ORIGINS` or
`ADMIN_PANEL_KEYS` is set, the panel check allows everything — deploying this
code cannot by itself reject traffic from the single panel running today.

`NEXT_PUBLIC_*` is **inlined at build time**, so each panel needs its own build —
you cannot promote one artefact between panels by changing an env var.

`REACT_APP_BASE_URL`/`REACT_APP_UPLOAD_URL` are forwarded in `next.config.mjs` and
read by ~40 files. They must be set on **every** target, or those screens break in
ways that look unrelated to the split.

**Auth:** Firebase persists per origin, so a super admin with accounts on both
signs in twice. That is fine, and arguably correct for the privileged panel. Do
not try to share sessions via a `.cocarr.com` cookie — it means handling raw ID
tokens yourself and re-couples the panels you just separated. Add every host to
Firebase → Authorised domains or sign-in fails with an unhelpful error.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| **The split is mistaken for access control** | §9 lands with Phase 1. Say so in the PR and the announcement. |
| **UI and server disagree about permissions** | One shared `resolveAccess(admin)` behind both `/admin/me` and `requirePermission` (§9a). Never two implementations. |
| **Deactivating a team doesn't cut off access** | §2b① — explicit deny instead of legacy fallback. Verify with a deactivate-then-call test before rollout. |
| **A stale `role` column outranks the team** | §2b② — remove the override, after confirming every `role === 2` admin sits on the `super-admin` team. |
| **A Firebase user with no `admins` row has full API access** | §2b③ — deny, keeping the bootstrap break-glass. |
| **Un-migrated admins (no `teamId`) see an empty panel** | Same fix — tier 3 of the chain must be honoured by `/admin/me`. Worth checking how many such rows exist before rollout. |
| **`admin.` changes meaning at Phase 2** | Stand up `root.` now as an alias (§4). |
| A team ends up with an empty portal | Build-time assertion: every panel's team list resolves to at least one readable module. Also the honest empty state in §6. |
| Bundles don't shrink | Step 8 measured before/after. If not, the split is still operationally useful — just say it's cosmetic separation. |
| A page is reachable on no panel | Assertion that every navConfig module belongs to ≥1 panel. |
| Cross-module links break at Phase 2 | `hostFor(module)` helper, introduced with the first cross-host link, used for all of them. |
| Super admins locked out mid-cutover | `admin.`/`root.` runs in parallel and is signed into successfully **before** `portal.` is narrowed. |

---

## 13. Still to decide

1. **`root.cocarr.com` alias now?** (§4 — recommended, and cheap.)
2. **Team→panel binding: per-panel API key or Origin check?** (§9c)
3. **What should the UI do when `RBAC_ENFORCE=false`?** The server allows
   everything in dry-run. Either the UI mirrors that (nothing hidden, dry-run
   stays a usable debugging posture) or it gates anyway (consistent UI, but
   dry-run no longer helps debug a lockout). Recommendation: **mirror**, and show
   a persistent banner so nobody mistakes a dry-run panel for a live one.
4. **Where do Live Activity / Quick Actions go** if they turn out to be too big to
   fold into one dashboard? Fallback: keep them as routes reachable from the
   dashboard, just not as nav children.

**Decided:** the console keeps the full panel (`modules: '*'`) — super admin sees
exactly what it sees today.
