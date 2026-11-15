# Dependency compatibility

Reviewed November 15, 2026. The supported runtime is Node 26.13.1 with npm
12.2.2. Frontend native-package pins must match their resolved parser, Rolldown
and Rollup versions; `check:native-bindings` verifies the locked Linux ARM64
packages independently of the current machine.

TypeScript 7.0.2 was evaluated during this update. The current
`typescript-eslint` 8.72.2 and its parser utilities require TypeScript
`>=4.8.4 <6.1.0`. Normal dependency resolution rejects TypeScript 7 with
`ERESOLVE`. This site retains supported TypeScript 6.0.3 while that compiler-API
compatibility work is pending upstream. Reassess TypeScript 7 when the lint and
Vue type-checking toolchains support it, then run the complete existing checks.
Keep peer validation and both dependency audits enabled throughout migration.
