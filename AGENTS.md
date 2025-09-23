# Repository Guidelines

## Project Structure & Module Organization
The project centers on the Next.js front end under `web/`. Application routes live in `web/src/app`, reusable UI in `web/src/components`, and Phaser gameplay logic in `web/src/game` with assets enumerated by `web/src/lib/assets.ts`. `docs/` holds the prebuilt static bundle for GitHub Pages, while `ghp/` stores deployment snapshots and `.github/workflows/gh-pages.yml` automates publishing. Avoid editing `web/.next`, `web/out`, or `docs/_next` by hand; they are generated.

## Build, Test, and Development Commands
Run `npm install` once in `web/`. Use `npm run dev` for the local server on port 3000, `npm run build` for static export, and `npm run start` to review the production build. `npm run lint` enforces Next.js lint rules, and `npm run type-check` must pass before any PR. The GitHub Pages workflow runs `npm ci` and `npm run build`; match that locally when debugging deployments.

## Coding Style & Naming Conventions
TypeScript is strict; prefer TypeScript files and keep imports using the `@/` alias for anything under `web/src`. Follow the default Next.js + ESLint formatting (2-space indents, single quotes, trailing commas). Component files should be PascalCase (e.g., `Mama.tsx`), hooks or utilities camelCase. Keep Phaser scene classes suffixed with `Scene` and colocate styles beside routes (`*.module.css`).

## Testing Guidelines
Automated tests are not yet in place; when adding them, place unit tests under `web/src/__tests__` or alongside the module with `.test.ts(x)` naming. Prefer `vitest` or Playwright depending on scope, and stub Phaser globals in game tests. Every change should at least run `npm run lint` and `npm run type-check`; include manual QA notes (browser + steps) in the PR until automated coverage is added.

## Commit & Pull Request Guidelines
Follow the existing Conventional Commit pattern `type:scope-subject` (e.g., `feat:web-bgm`, `fix:web-tiles-mama`). Keep scopes aligned to top-level folders. PRs need a concise summary, screenshots or GIFs for visual updates, a list of commands executed, and links to related issues. Ensure the branch is rebased on `main` and that the build artifacts (`web/out`, `docs`) are regenerated only via the approved commands.

## Deployment & Configuration
Set `NEXT_PUBLIC_BASE_PATH=/kourinbou-choikichi` when simulating GitHub Pages locally (`npm run build`). Do not commit secrets; runtime config is limited to public env vars. Deployment to Pages happens on every push to `main`; verify static exports before merging.
