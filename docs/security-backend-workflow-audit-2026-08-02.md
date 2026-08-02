# Authentication, authorization, security, and backend workflow audit

Audit date: 2026-08-02

## Scope and result

The review covered the public Vite application, Express contact and static-file service, SMTP boundary, deployment
identity, reverse-proxy trust, dependency and native-package graph, committed history, and production process boundary.
The site intentionally has no account, session, role, promotion/demotion, database, Vault, or administrative workflow.
Reserved account/admin paths return JSON `404` instead of receiving the SPA fallback.

No known npm vulnerability remains in either the full or production graph. Registry signatures and attestations pass,
all required Linux ARM64 native packages are committed in the lockfile, and both current source and 1,266 historical
commits pass secret scanning. The ignored local SMTP environment file is owner-readable only and is excluded from
release checkouts and build artifacts.

## Public contact boundary

- Input is strict JSON with a 16 KiB body limit and bounded name, email, message, and honeypot fields.
- Cross-site browser writes are rejected before parsing or mail delivery. Rate limiting uses the exact single-proxy
  client identity and does not trust a client-supplied forwarded chain.
- SMTP requires implicit TLS or STARTTLS, rejects sendmail and TLS bypasses, validates all identities, and requires a
  production password of at least 12 UTF-8 bytes when authentication is configured.
- Mail HTML and diagnostic headers are escaped, provider failures are logged only as bounded names/codes, and visitor
  content or SMTP responses are not reflected to the browser.
- Security headers deny framing and object embedding, disable MIME sniffing and Express disclosure, isolate the origin,
  and prohibit `unsafe-eval`. Health, readiness, and release responses are never cached.

## Findings remediated in v4.0.1

1. Production still required a Docker image and Compose service. The app now runs directly as the unprivileged
   `restoration` account under a read-only, capability-free systemd sandbox and listens only on `127.0.0.1:3007`.
2. Deployment preparation and rollback were container commands rather than a source-enforced release transaction.
   Exact annotated tag/main identity, clean installs, full and production audits, signed package provenance, code and
   browser validation, atomic release selection, and automatic source rollback are now repository gates.
3. Public rollout did not independently require both local IPv4 and IPv6 TLS paths. Promotion now verifies exact
   release identity, readiness, strict headers, cross-site mutation denial, and reserved-route denial over both address
   families without changing DNS.
4. Production dependency minimality was an image-build concern only. A clean backend-only production install and real
   direct-process smoke test now prove that the runtime has no development or frontend tool dependency. npm workspace
   packages that it still marks as development-only or extraneous are safely pruned before that proof.

The only deliberately retained version gaps are Node 24 type definitions rather than Node 26 definitions, TypeScript 6
rather than the ecosystem-incompatible TypeScript 7 line, and OXC 0.140 platform bindings that must match their parent
parser ABI. They are not vulnerability exceptions.
