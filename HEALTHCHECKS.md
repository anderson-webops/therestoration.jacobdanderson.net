# Health Checks

These endpoints are unauthenticated, never redirect, and return `Cache-Control: no-store`.

## Liveness

`GET /healthz` returns `200 {"ok":true}` when the Node process can answer HTTP requests.
`HEAD /healthz` returns the same status with no response body.

## Readiness

`GET /readyz` returns:

- `200 {"ok":true}` when the TLS SMTP configuration was validated at startup.
- `503 {"ok":false}` when contact delivery is not configured.

`HEAD /readyz` performs the same check and returns the same status with no body.
`GET /release.json` remains the separate exact release-identity endpoint.

The probes never authenticate, redirect, set cookies, or expose secrets,
database names, host details, process metrics, environment information, or
component diagnostics.

The systemd promotion gate uses `/readyz`, so an incomplete SMTP configuration cannot be considered deploy-ready.

There is no database diagnostic, login, account, role, promotion, or demotion endpoint in the v4 service.
