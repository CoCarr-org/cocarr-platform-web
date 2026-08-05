# cocarr-platform-web

> Cocarr enterprise web platform — one Next.js codebase serving every product surface via build-time panels.

Part of the **Cocarr Enterprise Platform** ([CoCarr-org](https://github.com/CoCarr-org)).

Topics: `nextjs`, `react`, `redux`, `firebase`, `tailwindcss`, `enterprise`

## Purpose
The Cocarr web platform. A single Next.js (App Router) application that serves
each product surface — `admin`, `workspace`, `ops`, `finance`, … — as a
**build-time panel** (`NEXT_PUBLIC_PANEL` + a deploy target), not as separate
codebases. Nav, routing and permissions are all derived at runtime from IAM, so
standing up a new product is a panel entry plus a build target, with no
component/routing/nav changes. Migrated unchanged from the original
`COCARR-ADMIN`; the working app is reused, not rewritten.

## Architecture
This repository is one component of the Cocarr platform, a service-oriented
system fronted by the API gateway. Requests flow through the gateway to the
identity, authorization, workspace, core and notification services, each backed
by its own database. See [`cocarr-docs`](https://github.com/CoCarr-org/cocarr-docs)
for the full platform architecture and Architecture Decision Records.

## Technology Stack
- Next.js 15 (App Router) + React 19
- Redux Toolkit + redux-persist
- Firebase Auth (admin project)
- Tailwind CSS v4 + Radix UI
- react-hook-form + Zod, axios
- ESLint + Prettier

## Folder Structure
```
src/app/            # App Router entry; hand-rolled catch-all router + panels
src/app/_pages/     # Page components (mapped in the catch-all router)
src/app/_components/ # Shared components (ResourceManager, PanelBoot, ...)
src/app/_helpers/   # panels.js, permissions.js, media.js, navConfig
src/components/ui/  # Radix-based UI primitives
src/hooks/ src/lib/ src/store/  # Hooks, utilities, Redux store
public/             # Static assets
scripts/            # Panel-coverage and helper scripts
.github/            # Issue/PR templates, workflows (ci + branch-policy), CODEOWNERS
```

> Routing is **not** file-based — see `CLAUDE.md` (migrated from `COCARR-ADMIN`)
> for the catch-all router, the `NEXT_PUBLIC_PANEL` model and the permission system.

## Getting Started
```bash
# Clone
git clone https://github.com/CoCarr-org/cocarr-platform-web.git
cd cocarr-platform-web

# Work from the develop branch
git checkout develop
```
Install dependencies with `npm install`, then run `npm run dev`. Set the
required `NEXT_PUBLIC_*` env vars (Firebase config, `NEXT_PUBLIC_PANEL`, API base
URL) for the panel you are building.

## Development
- Dev server: `npm run dev`
- Build: `npm run build` (set `NEXT_PUBLIC_PANEL` for the target panel)
- Lint: `npm run lint`

Editor settings, Prettier, ESLint, EditorConfig and VS Code configuration ship
with the repository for a consistent developer experience.

## Contributing
Please read [CONTRIBUTING.md](CONTRIBUTING.md) and use the issue and pull
request templates. All changes require CODEOWNER review.

## Branch Strategy
| Branch    | Purpose                                   | Protected |
|-----------|-------------------------------------------|-----------|
| `main`    | Always-deployable production baseline     | Yes       |
| `develop` | Integration branch for feature work       | No        |
| `release` | Release-candidate stabilisation branch    | Yes       |

Feature branches: `feature/<description>` from `develop`.

## Deployment
Each app in `apps/` builds via Turborepo (`pnpm turbo run build`) and deploys independently. Preview builds run on every PR.

## Security
See [SECURITY.md](SECURITY.md) for vulnerability reporting. Dependabot alerts
and secret scanning are enabled where supported.

## License
Licensed under the [MIT License](LICENSE).
