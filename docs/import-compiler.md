# Auto-import compiler acceptance

Restoration uses Unimport 7.0.3 through its actual Vite auto-import plugin.
The maintained 21.1.0+webops.1 parent declares Unimport 7 and Local-pkg 2 while
preserving all 25 original package files except the reviewed manifest changes.
Its public declarations, framework adapters and license remain unchanged.

The source-built compiler is the exact canonical v2.1.40 distribution.
`vendor/unimport/QUALIFIED.json` binds that source commit, qualification runs,
archive digest and complete source recipe. The original signed source tree,
public signer and Git objects remain available. Preparation performs clean
independent build/runtime installations, full/production audits, complete
signature checks, two fresh identical builds and confined runtime acceptance.

The original 21.1.0 parent remains in a separate locked comparison graph with
its original Unimport 6 provider. Every application compiler consumer must bind
the qualified 7.0.3 archive. Reference-only older versions retain their distinct
purpose and audit scope; they are excluded from the production runtime.

Focused acceptance exercises real JS/TS/Vue injection, shadowed and annotated
locals, working-project VueUse metadata, local composable discovery, generated
declarations and globals, and strict TypeScript 6/7 Vite consumers. A real
minified Vite build is opened in a browser for hydration, reactive updates,
lazy JavaScript/CSS loading and reload. Existing application tests, accessibility,
contact behavior, production closure and retained-artifact recovery remain
required separately.

The canonical upstream 271-case qualification is retained with the unchanged
compiler recipe. Renew that qualification whenever the recipe or source changes;
ordinary downstream acceptance focuses on the actual application consumer.
