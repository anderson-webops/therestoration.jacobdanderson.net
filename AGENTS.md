# Repository Guidelines

## Standing Dependency Completion Policy

Treat dependency remediation as part of completing authorized work on this
site, not as an optional follow-up. Proactively resolve vulnerabilities,
compatibility problems, broken installations and lockfile issues. Cover direct
and transitive dependencies, production and development dependencies,
workspaces and root-level tools. Do not dismiss findings because they are
pre-existing or development-only.

Before creating a release tag or publishing a release, require a clean locked
installation for every applicable dependency graph, zero known dependency
vulnerabilities in both full and production audits, and all applicable project
checks. An unavailable or incomplete audit is not a clean result. Use supported
upgrades, replacements or maintainable patches that preserve functionality.
Do not silence findings, weaken checks or force incompatible versions merely
to obtain a passing result.

Intermediate commits may capture coherent progress. Commit and push validated
work through this site's authorized delivery process, and complete meaningful
releases rather than stopping after reporting fixable dependency blockers.
Documentation-only housekeeping does not require an application release.

Preserve unrelated work, coordinate with other active chats, and retain existing
security, approval and production-access boundaries. Existing maintenance pauses
and repository exclusions remain in force; this policy does not expand access
or authorize otherwise excluded work. If a genuine blocker prevents completion,
preserve progress and report the exact blocker and remaining work. Distinguish
a published release from verified live deployment.

Treat this as a standing instruction for this site.

Shared Sites policy (`../AGENTS.md` when available) applies. These essentials also apply in standalone checkouts:
- Never SSH, SCP, SFTP, tunnel to, or configure access to production. Do not deploy it; protected server-side automation owns activation, and source delivery alone does not prove deployment.
- GitGuardian quota, authentication, network, or service failure is not a commit/push blocker. Review outgoing changes, run another available local secret scan, preserve other hooks, and stop on real secret findings.
- Commit small, coherent, validated changes frequently as work progresses and push completed work through this repository's authorized source path, usually its default branch; use pull requests only when required.
- Group related changes into meaningful deployable milestones. Align version metadata, create a new immutable annotated semver tag, and publish its matching verified GitHub release with the required accepted artifacts.
- Complete finished deployable work through the published release consumed by protected deployment. Independently verify public release identity and acceptance read-only, or report the exact remaining blocker. Never move published tags or replace published release assets.

## Project Structure & Module Organization

- `front-end/` hosts the Vite-powered Vue 3 client. Routing views live in `src/pages`, shared UI in `src/components`,
  state in `src/stores`, and feature logic in `src/modules`. Static assets belong in `public/`, while
  i18n copy sits under `front-end/locales/`.
- Front-end unit specs reside in `front-end/test/*.spec.test.ts`. End-to-end workflows
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
- `npm run lint` (or `lint-fix`) runs the shared ESLint configuration across both workspaces.

## Coding Style & Naming Conventions

- ESLint extends `@antfu/eslint-config` and enforces Prettier with tab indentation, double quotes, semicolons,
  120-character lines, and LF endings. Run `npm run lint-fix` before pushing.
- Vue single-file components use PascalCase filenames (`TheHeader.vue`), composables use the `useFeature` pattern, and
  Pinia stores live in `src/stores/`.
- TypeScript modules should export camelCase functions and PascalCase classes/types. Keep front-end route files
  lowercase to match the generated router.
- Keep server helpers near `back-end/src/app.ts`, `contact.ts`, and `server.ts` rather than introducing unrelated
  controller scaffolding.

## Testing Guidelines

- Write unit tests with Vitest and follow the `*.spec.test.ts` naming used in `front-end/test/`.
- Cypress specs should stub contact API calls against the Express test server; add local fixtures only when a test needs them.
- Back-end tests live under `back-end/test/`; cover request bounds, security headers, rate limits, sanitized failures,
  readiness behavior, and the deliberate absence of account/admin/database routes.
- Aim to cover new endpoints, Pinia stores, and critical user flows before delivery; document any intentionally skipped
  scenarios in the final handoff and in any required pull request.

## Security & Configuration Tips

- The only secret-bearing runtime integration is TLS-protected SMTP for the public contact form. Keep credentials in
  an ignored `.env`, require STARTTLS or implicit TLS, and never enable sendmail or certificate bypasses.
- The systemd service binds to host loopback and trusts exactly the documented reverse-proxy hop count. Do not broaden
  the listener or proxy trust boundary without reviewing rate-limit identity and the external routing topology.
- Never commit real credentials. Logs and HTTP responses must contain only bounded error names/codes, not SMTP
  response bodies, credentials, submitted messages, or other visitor data.

## Release Scope

- This repo follows the stable `v4.x` line after the intentional stateless production-runtime migration. Stay on `v4`
  for routine work; only cut `v5` for another intentional breaking site or API change.
- Content structure, frontend behavior, contact delivery, dependency security, and deploy/health behavior are release-worthy when deployable.

## Dependency & Lockfile Discipline

- Keep the root `package-lock.json` aligned with every workspace manifest. For dependency changes, review both production and development packages, run a clean root `npm ci` (not an install fallback), full and production audits, and relevant lint, type, test, and build gates. Regenerate and include the lockfile if it drifts.
