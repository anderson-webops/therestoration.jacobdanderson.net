# Repository Guidelines

## Project Structure & Module Organization

- `front-end/` hosts the Vite-powered Vue 3 client. Routing views live in `src/pages`, shared UI in `src/components`,
  state in `src/stores`, and feature logic in `src/modules`. Static assets belong in `public/` and `src/assets/`, while
  i18n copy sits under `locales/`.
- Front-end unit specs reside in `front-end/test/*.spec.test.ts` (snapshots in `__snapshots__/`). End-to-end workflows
  live in `front-end/cypress/`.
- `back-end/` contains the stateless Express contact API and production static-file server. `src/app.ts` owns HTTP
  policy and routes, `src/contact.ts` owns validation and SMTP delivery, and `src/server.ts` owns startup and shutdown.
- This site has no account, session, role, promotion/demotion, database, or administrative workflow. Do not add one
  incidentally; any future authenticated capability requires a separate threat model and an intentional API design.
- Monorepo-wide configuration (ESLint, TypeScript base config, workspace scripts) is defined at the repository root;
  update these when adjusting tooling for either project.

## Build, Test, and Development Commands

- `npm ci` (root) installs the authoritative lockfile using Node `24.18.1` and npm `12.0.2`. Avoid mixing package
  managers or using a nested lockfile.
- `npm run dev` starts the front-end dev server on port 3333; `npm run serve` runs the same build with `--host` enabled
  for LAN previews.
- `npm run server` launches the API with live reload via `tsx watch -r dotenv/config` on port 3007.
- `npm run build` produces optimized client + server bundles (`front-end/dist/`, `back-end/dist/`).
- `npm run -w front-end test` / `test:unit` run Vitest suites; `npm run -w front-end test:e2e` runs Cypress.
- `npm run -w back-end test` runs the Vitest + Supertest API security and behavior regression suite.
- `npm run lint` (or `lint-fix`) runs the shared ESLint configuration across both workspaces;

## Coding Style & Naming Conventions

- ESLint extends `@antfu/eslint-config` and enforces Prettier with tab indentation, double quotes, semicolons,
  120-character lines, and LF endings. Run `npm run lint-fix` before pushing.
- Vue single-file components use PascalCase filenames (`TheHeader.vue`), composables use the `useFeature` pattern, and
  Pinia stores live in `src/stores/`.
- TypeScript modules should export camelCase functions and PascalCase classes/types. Keep front-end route files
  lowercase to match the generated router.
- Prefer descriptive directory names (`controllers/common/`, `controllers/users/`) and colocate feature-specific assets
  alongside their modules.

## Testing Guidelines

- Write unit tests with Vitest and follow the `*.spec.test.ts` naming used in `front-end/test/`. Snapshot updates belong
  in `__snapshots__/` and should be reviewed line-by-line.
- Cypress specs should stub network calls against the Express test server; store fixtures under
  `front-end/cypress/fixtures/`.
- Back-end tests live under `back-end/test/`; cover request bounds, security headers, rate limits, sanitized failures,
  readiness behavior, and the deliberate absence of account/admin/database routes.
- Aim to cover new endpoints, Pinia stores, and critical user flows before requesting review; document any intentionally
  skipped scenarios in the PR.

## Commit & Pull Request Guidelines

- Follow the existing history: present-tense, concise subjects (`Add tutor availability routes`). Keep summaries under
  72 characters and expand details in the body when needed.
- Reference GitHub issues with `Fixes #123` or `Refs #123` in the description.
- Before opening a PR, ensure `npm run lint` and relevant tests pass, and include screenshots or screen recordings for
  UI-facing changes.
- PR descriptions should outline scope, testing evidence, migration steps (if any), and rollout considerations.

## Security & Configuration Tips

- The only secret-bearing runtime integration is TLS-protected SMTP for the public contact form. Keep credentials in
  an ignored `.env`, require STARTTLS or implicit TLS, and never enable sendmail or certificate bypasses.
- The systemd service binds to host loopback and trusts exactly the documented reverse-proxy hop count. Do not broaden
  the listener or proxy trust boundary without reviewing rate-limit identity and the external routing topology.
- Never commit real credentials. Logs and HTTP responses must contain only bounded error names/codes, not SMTP
  response bodies, credentials, submitted messages, or other visitor data.

## Agent Delivery Workflow

- Do not leave completed work uncommitted. After each coherent, validated change set, create a commit and push it in the same session.
- Use multiple commits and pushes when that keeps unrelated changes, partial validations, or follow-up fixes clearly separated. Prefer small, logically grouped commits over one mixed commit.
- Keep `package-lock.json` synchronized before every commit or push.
- Use lowercase annotated semver tags only. Do not invent ad-hoc labels such as `V1`, `torca-r07`, `pre-lfs-migration-*`, or similar one-off names.
- This repo follows the stable `v4.x` line after the intentional stateless production-runtime migration. Stay on `v4`
  for routine work; only cut `v5` for another intentional breaking site or API change.
- Before creating a new tag, check the latest tag in the active semver line and decide whether the new commit is still the same release milestone. If it is, move that existing tag forward to the new validated commit instead of minting a new version number.
- Keep the GitHub release aligned with that decision: when the commit still belongs to the same milestone, update or recreate the existing release so it points at the moved tag/current commit; only create a brand-new release when the change creates a genuinely new milestone.
- Cut a fresh semver tag and release only when the work crosses a real release boundary, such as a new deployable milestone, a materially different operator/user-facing state, or a version-line change that deserves its own notes and rollback point.
- Create an annotated tag when content structure, front-end behavior, dependency/security, search/runtime, or deploy/health behavior materially changes.
- Create a GitHub release when that tag represents a meaningful public-site or operational milestone. Release notes should summarize scope, validation, rollout notes, and any migration or recovery steps.
- If the existing tag or release history contains stale drafts, redundant entries, or ad-hoc labels, clean that history up instead of preserving clutter.
- Skip tags and releases for trivial doc-only edits, formatting-only changes, or routine housekeeping unless they change deployment, operations, or a consumer-facing contract.

## Dependency & Lockfile Discipline

- Treat the repo-root `npm ci` path as the source of truth for deploy readiness.
- Any time `package.json`, any workspace `package.json`, dependency ranges, `package-lock.json`, or dependency update tooling changes, verify lockfile parity from the repo root before committing.
- Do not rely on `npm install` fallback as success. A change is not deploy-ready unless root `npm ci` succeeds.

Required production/dev dependency update flow before every dependency commit:

1. Check production and development dependency freshness from the repository root with `npm outdated --workspaces --long` or the repo's documented equivalent.
2. Review both `dependencies` and `devDependencies` in the root and every workspace package; do not limit updates to production-only packages.
3. Apply needed updates with the narrowest command that updates the relevant manifest and lockfile together, such as `npm install -w <workspace> <package>@<version>` or `npm install -D -w <workspace> <package>@<version>`.
4. If the update is only a lockfile/security refresh, regenerate from the root with `npm install --package-lock-only --ignore-scripts --no-fund --no-audit`.
5. Run `npm audit` from the repository root and resolve remaining production or dev advisories before committing unless a documented upstream limitation prevents it.

Required dependency verification before every commit/push:

1. Run `npm ci` from the repository root.
2. Run `npm run lint`.
3. Run `npm run typecheck`.
4. Run `npm run build`.
5. If API or back-end behavior changed and the repo has a back-end workspace, run `npm run -w back-end test` or the repo's equivalent API test command.

If `npm ci` fails because `package.json` and `package-lock.json` are out of sync:

1. Run `npm install --package-lock-only --ignore-scripts --no-fund --no-audit` from the repository root.
2. Re-run `npm ci` from the repository root.
3. Commit the resulting `package-lock.json` change with the related dependency/package change.

Never commit or push dependency/package changes if root `npm ci` fails.
