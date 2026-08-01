# The Restoration back end

Stateless Express service for the public site and contact form. It serves `front-end/dist`, exposes liveness/readiness,
and delivers validated contact submissions through one reusable SMTP transport.

## Security boundary

- No database, Vault, cookie, session, user, administrator, role, promotion, or demotion state exists.
- `POST /api/contact` accepts strict JSON only, with a 16 KiB body limit and five requests per 15 minutes by default.
- All mail HTML is escaped, header values are single-line, errors are sanitized, and contact contents are not logged.
- Sendmail and `CONTACT_SMTP_REQUIRE_TLS=false` are rejected.
- Production requires an explicit `TRUST_PROXY_HOPS` value; the provided loopback-bound container topology uses `1`.

## SMTP settings

- `CONTACT_FROM_EMAIL` and `CONTACT_SMTP_HOST` are required when contact delivery is enabled.
- `CONTACT_TO_EMAIL` defaults to `contacts@jacobdanderson.net`.
- `CONTACT_BCC_EMAIL` accepts an optional comma-separated list.
- `CONTACT_SMTP_SECURE=true` uses implicit TLS (normally port 465). Otherwise STARTTLS is mandatory (normally 587).
- `CONTACT_SMTP_USER` and `CONTACT_SMTP_PASS` must be configured together. Production passwords must be at least 12
  UTF-8 bytes.

See the root `.env.example` for the complete non-secret template.
