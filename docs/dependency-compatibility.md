# Dependency compatibility

Reviewed November 17, 2026. The supported runtime is Node 26.13.1 with the
independently locked build-only npm 12.2.2 profile. Frontend native-package pins
must match their resolved parser, Rolldown
and Rollup versions; `check:native-bindings` verifies the locked Linux ARM64
packages independently of the current machine.

The backend build, watch and typecheck commands select TypeScript 7.0.2 through
the `typescript-native` alias and an explicit launcher. Vue and ESLint retain
TypeScript 6.0.3 as their compiler API: `typescript-eslint` 8.73.0 still declares
`>=4.8.4 <6.1.0`. The named backend commands avoid ambiguous compiler binaries.
Native npm/npx type fixtures cover both interfaces while preserving peer checks.

`build-toolchain/` is the reviewed shared profile from template commit
`1bb8cee5bbdf37f77f8b0373a86f39b908a263dc`. Its original npm CLI bytes and
licenses remain intact; production dependencies resolve through independent
locked graphs. The four shared bootstrap/cache helpers retain exact source bytes
so compatible sites reuse an accepted cache without expanding its existing cap.
The site checker binds the selected receipt to the existing Node/npm runtime
contract. Artifact acceptance records the profile and its source hashes; the
production inventory excludes npm and other build-only tools.

Select the pinned Node, then run:

```sh
export PATH="$(node scripts/build-toolchain.mjs --print-bin):$PATH"
npm ci --prefix build-toolchain/compat --workspaces=false --ignore-scripts
npm ci --include=optional --strict-allow-scripts
npm run audit:all
npm run audit:prod
npm run validate
```

The maintained Picomatch archive preserves original source/license provenance
and rejects repeated-output patterns implicated in GHSA-fc5q-39xc-vjpf. Its
producer, original archive, security/ordinary-behavior comparisons and actual
application/npm consumer checks remain in source.

The retained layouts plugin is consumed as a reproducible archive rather than
a linked directory. Its ten original source, declaration, license and provenance
files remain unchanged. This gives npm a portable dependency boundary for root
archive overrides. `check:local-archives` independently reproduces both archives;
the existing layouts behavior suite continues to exercise the installed plugin.

Oxfmt 0.79 and Oxc parser 0.159 replace the older indirect providers used by
`eslint-plugin-format` and UnoCSS. The compatibility suite exercises the real
ESLint formatting worker, repeat formatting and UnoCSS's explicit native JSX/TSX
resolver with blocked and valued attributes. It requires the selected providers
and preserves errors rather than accepting the transformer's regex fallback.
Full lint, Vue/backend types, site build and browser checks remain required.

Runtime contract format, the stateless SMTP service, prior-release contracts
and genuine retained-artifact recovery remain unchanged. Clean locked installs,
both dependency audits, source checks and exact ARM64 acceptance qualify a
release; source publication and protected activation retain separate evidence.
