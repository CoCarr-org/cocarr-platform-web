# cocarr-platform-web

> Enterprise Turborepo containing all Cocarr web applications and shared UI packages.

Part of the **Cocarr Enterprise Platform** ([CoCarr-org](https://github.com/CoCarr-org)).

Topics: `react`, `vite`, `typescript`, `turborepo`, `pnpm`, `enterprise`

## Purpose
Monorepo home for every Cocarr web surface (admin, workspace, marketing) and the shared UI / config packages they consume.

## Architecture
This repository is one component of the Cocarr platform, a service-oriented
system fronted by the API gateway. Requests flow through the gateway to the
identity, authorization, workspace, core and notification services, each backed
by its own database. See [`cocarr-docs`](https://github.com/CoCarr-org/cocarr-docs)
for the full platform architecture and Architecture Decision Records.

## Technology Stack
- React 18
- Vite
- TypeScript
- Turborepo
- pnpm workspaces
- ESLint + Prettier

## Folder Structure
```
apps/            # Deployable web applications (admin, workspace, web)
packages/        # Shared UI, config, tsconfig and lint presets
docs/            # Architecture notes and package guides
.github/         # Issue/PR templates, workflows, CODEOWNERS
```

## Getting Started
```bash
# Clone
git clone https://github.com/CoCarr-org/cocarr-platform-web.git
cd cocarr-platform-web

# Work from the develop branch
git checkout develop
```
Copy `.env.example` to `.env` where applicable and install dependencies with
your package manager (`pnpm install`).

## Development
- Format: `pnpm prettier --write .`
- Lint: `pnpm lint`
- Test: `pnpm test`

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
