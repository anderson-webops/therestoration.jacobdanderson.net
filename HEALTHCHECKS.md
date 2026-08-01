# Health Checks

These endpoints are unauthenticated, never redirect, and return `Cache-Control: no-store`.

## Liveness

`GET /healthz` returns `200 {"ok":true}` when the Node process can answer HTTP requests. Use it only to distinguish a
dead process from a live one.

## Readiness

`GET /readyz` returns:

- `200 {"ready":true,"components":{"contactMail":{"ok":true}}}` when the TLS SMTP configuration was validated at startup.
- `503 {"ready":false,"components":{"contactMail":{"ok":false}}}` when contact delivery is not configured.

Container health checks use `/readyz`, so an incomplete SMTP configuration cannot be considered deploy-ready.

There is no database diagnostic, login, account, role, promotion, or demotion endpoint in the v4 service.
