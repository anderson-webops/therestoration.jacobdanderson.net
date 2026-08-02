# Health Checks

These endpoints are unauthenticated, never redirect, and return `Cache-Control: no-store`.

## Liveness

`GET /healthz` returns `200` with `{ "ok": true, "deployment": ... }` when the Node process can answer HTTP requests.
Use it only to distinguish a dead process from a live one and to verify the exact release identity.

## Readiness

`GET /readyz` returns:

- `200` with `ready: true` when the TLS SMTP configuration was validated at startup.
- `503` with `ready: false` when contact delivery is not configured.

Both responses include the same exact release, full Git revision, and deployment timestamp. `GET /release.json`
returns that identity alone. Production startup fails unless all three values are present and the release matches the
source package version.

The systemd promotion gate uses `/readyz`, so an incomplete SMTP configuration cannot be considered deploy-ready.

There is no database diagnostic, login, account, role, promotion, or demotion endpoint in the v4 service.
