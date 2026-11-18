# Qualified source-built import compiler

The application uses Unimport 7 through its maintained Vite auto-import parent.
`QUALIFIED.json` binds the exact canonical v2.1.40 source qualification, compiler
archive, source recipe and independent build locks. The original signed source,
public signer, Git objects, license and declarations remain retained here.

`scripts/check-unimport-archive.py` verifies the complete signed source tree,
canonical inputs, reviewed source patches, portable runtime requirements and
every compiled output. Its installed mode binds actual application consumers.
`scripts/prepare-unimport-source.sh` performs clean independent build/runtime
installations, full/production audits, complete signature checks, two fresh
byte-identical rebuilds and confined artifact execution before application use.

The canonical qualification already exercised all 271 upstream cases and native
upstream type/lint checks. Restoration exercises its actual Vite consumer,
declaration generation, local scanning and browser behavior, while retaining
the source-provenance regressions. Changes to the compiler recipe or source
require renewed upstream qualification with
`python3 -B scripts/build-unimport-source.py --check --validate-upstream`.

The separate original parent fixture preserves its Unimport 6 comparison;
the application graph requires only the qualified version 7 compiler.
