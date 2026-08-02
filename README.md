# therestoration.jacobdanderson.net

Public history site and contact service for `therestoration.jacobdanderson.net`.

## Production design

The Vite application is generated into static files. One stateless Express process serves those files and the bounded
`POST /api/contact` endpoint. The production image does not contain a database, Vault client, account/session state,
role management, or package manager.

This site is intentionally unauthenticated. There are no promotion or demotion operations and no administrative API.
Adding any of those is a breaking security-boundary change, not an extension of the contact endpoint.

## Repository layout

- `front-end/` — Vite SSG application
- `back-end/` — stateless Express contact API and production web server
- `scripts/check-native-bindings.mjs` — Linux ARM64 lockfile reproducibility gate
- `HEALTHCHECKS.md` — liveness and readiness contracts
- `deploy/nginx/therestoration.locations.conf` — host routing for the single application origin

The root `package-lock.json` is the only lockfile and the source of truth for local, CI, and container installs.

## Validation

Use Node `24.18.1` and npm `12.0.2`:

```bash
npm ci
npm run audit:all
npm run audit:prod
npm run validate
npm run a11y
npm run test:e2e
```

`npm run server` starts the development API on port 3007; `npm run dev` starts the front-end dev server on port 3333
and proxies `/api` without rewriting the route.

## Contact delivery

Copy `.env.example` to an ignored `.env` and provide unique SMTP credentials. SMTP must use implicit TLS or STARTTLS;
sendmail and disabling TLS are rejected. `CONTACT_TO_EMAIL` defaults to `contacts@jacobdanderson.net`, and
`CONTACT_BCC_EMAIL` is optional.

The API accepts only strict JSON, bounds every field and request body, silently absorbs a honeypot, rate limits by the
proxy-derived client address, rejects cross-site browser writes, escapes all mail HTML, and returns sanitized errors. The container publishes only
`127.0.0.1:3007` and is intended to sit behind one trusted local reverse proxy.

Use [`HEALTHCHECKS.md`](./HEALTHCHECKS.md) for deployment monitors and [`deploy/README.md`](./deploy/README.md) for the
exact-identity production rollout.
