# Direct immutable production rollout

The v4 production boundary is one unprivileged Node process on `127.0.0.1:3007`. It serves the built site, contact
API, minimal health/readiness endpoints, and release identity. Nginx remains the only public listener. Production does
not use Docker, Compose, a source checkout, development dependencies, or a package manager at runtime.

## Release artifact

An annotated `v4.*` tag must point to the exact default-branch commit that already passed the main CI workflow. Main
CI owns lint, types, unit tests, promotion/recovery regressions, accessibility, and browser checks once. The tag
launches one focused Linux ARM64 job for the clean locked install, development and production audits, package
signatures, native-binding checks, build, and sterile runtime acceptance. It then publishes these immutable release
assets without overwriting an existing release:

- the closed Linux ARM64 runtime archive;
- its SHA-256 file;
- the exact runtime manifest; and
- the acceptance receipt, including hashes of the acceptance harness.

`deploy/runtime-artifact.json` is the independent allowlist. The archive contains only compiled entrypoints, the
front-end output, the exact back-end production dependency closure, package identity, and prepared source identity.
It contains no environment files, credentials, private configuration, cache, queue, spool, database, or writable
state. The application has no migration or release-local durable-state requirement.

The acceptance harness unpacks the exact archive in isolation with no source checkout or development dependencies. It
tests both service entrypoints, GET and HEAD health/readiness, release identity, static content, synthetic provider
failure, cross-site denial, graceful shutdown/restart, and a deliberately missing compiled module. The promotion
harness exercises success, failure, interruption, lock contention, tampering, first activation, and verified rollback.
Candidate code is never executed as root.

## Protected host controls

From a separately reviewed root-owned copy of the exact release source, run:

```bash
sudo deploy/systemd/install-service.sh
```

The installer does not restart production. It preserves the existing protected environment files, establishes
root-owned release/artifact/recovery directories, installs versioned root-owned controls beneath
`/usr/local/libexec/therestoration-release`, updates the `current` helper symlink atomically, and installs the hardened
service unit. The service remains `restoration:restoration`, uses `/usr/bin/node` v24.18.1, and retains the established
port and host paths. Its 96 MiB V8 heap, 160/192 MiB systemd memory thresholds, disabled swap, 32-task ceiling, and
bounded file descriptors are intentional memory-pressure controls.

Keep `/etc/therestoration/app.env` and `/etc/therestoration/release.env` owned by `root:restoration` with mode `0640`.
The promoter writes only release, commit, and actual deployment time to `release.env`; it never reads or prints SMTP
credentials. SMTP must continue to require TLS. No writable path exists inside an immutable release.

## One-time v4.0.4 rollback transition

The current v4.0.4 release predates the artifact contract and is intentionally not accepted directly as rollback
evidence. During an approved maintenance window, after installing the protected controls, run exactly:

```bash
sudo /usr/local/libexec/therestoration-release/current/deploy/systemd/seal-v4.0.4-rollback.sh \
  396f75b089d1e8c4f60f349d43ec426a80a3a1db
```

The one-time helper accepts only v4.0.4 at that exact commit. It takes the service briefly offline, refuses capture if
any service-owned process remains, freezes the old checkout under root ownership, and copies only the runtime
entrypoints, public output, package identity, and production dependency closure into a root-owned sealed
rollback tree, hashes every retained file, compares the source twice, switches the existing pointer without changing
release identity, restarts, and checks health/readiness. Any failure restores the original pointer and service. Do not
rewrite the old tag, patch its installed dependencies, or bypass this transition.

## Artifact-only promotion

Place the downloaded archive in `/srv/therestoration/incoming` as a root-owned mode `0600` file. Independently verify
the annotated tag, successful tagged workflow, published checksum, asset name, and exact commit. Then run the installed
helper, not a script from the release or source checkout:

```bash
sudo /usr/local/libexec/therestoration-release/current/deploy/systemd/promote-release.sh \
  /srv/therestoration/incoming/<archive>.tar.gz \
  <sha256> \
  <full-40-character-commit>
```

The helper retains the exact archive under a root-only artifact directory, unpacks it itself, verifies its closed
manifest and source identity, installs a root-owned immutable release, and records protected acceptance provenance.
It checks Nginx without changing or reloading it, switches `current` atomically, restarts only the Restoration service,
and verifies minimal probes, exact identity/content, strict headers, cross-site mutation denial, and reserved-route
denial over local IPv4 and IPv6 TLS. If acceptance fails, it re-verifies and restores the previous artifact or sealed
v4.0.4 runtime. A root-only recovery record is retained only when rollback itself fails.

After activation, verify the exact public release from an independent external network:

```bash
VERIFY_RESTORATION_EXPECT_RELEASE=v4.0.9 \
VERIFY_RESTORATION_EXPECT_COMMIT=<full-40-character-commit> \
npm run verify:public
```

Server-origin checks are not independent WAN evidence. This workflow does not modify DNS, certificates, Nginx policy,
routing, or firewall rules. Preserve both address families and every existing A and AAAA record; A or AAAA records are
not troubleshooting controls. Preserve the installed service account, port, environment, certificate, and IPv4/IPv6
edge topology.
