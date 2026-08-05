# Deployment — cocarr-platform-web (Railway)

A single Next.js app deployed **once per panel**. Config is in `railway.json`
(Nixpacks); required variables are in [`.env.example`](../.env.example).

## Why one service per panel
`NEXT_PUBLIC_PANEL` and all other `NEXT_PUBLIC_*` values are **inlined into the
client bundle at build time**. So `admin.cocarr.com`, `ops.cocarr.com`, etc. are
*separate Railway services that build the same repo with a different
`NEXT_PUBLIC_PANEL`* — not one deployment behind a router. This is by design:
the panel a build ships determines which modules and privileges are present in
the bundle at all (see `CLAUDE.md` → panels).

This is also why Nixpacks (not a prebuilt Docker image) is used: Railway makes
the service's variables available at build time, so each service bakes in its
own panel. A single shared image can't carry per-panel client config.

## Runtime facts
- Build: `npm run build` (Next 15). Start: `npm run start` (`next start`, reads `PORT`).
- Firebase client config is **public** (publishable keys) — safe to expose.
- `PANEL_KEY` is the one **server-only** secret (gateway mode); never prefix it `NEXT_PUBLIC_`.

## First-time setup per panel (manual — needs your dashboard)
1. **Create a service** from `CoCarr-org/cocarr-platform-web`, branch `develop`.
2. Set variables from `.env.example`, with `NEXT_PUBLIC_PANEL` = this panel
   (`admin`, `ops`, …) and the Firebase config for the admin project.
3. Point `NEXT_PUBLIC_BASE_URL` / `REACT_APP_BASE_URL` at the core-api URL
   (`https://api.cocarr.com/v1`).
4. Generate the public domain (or map `admin.cocarr.com`, etc.).
5. Repeat for each additional panel — same repo, new service, different
   `NEXT_PUBLIC_PANEL` (+ `PANEL_KEY` if using gateway mode).

## Start small
Stand up the `admin` panel first (it already ships `'*'` minus root-only
modules). Add `root` and per-team panels later — each is one more service plus a
`_helpers/panels.js` entry, no code changes (`scripts/checkPanelCoverage.mjs`
verifies the lists).
