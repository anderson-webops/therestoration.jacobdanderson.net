# therestoration.jacobdanderson.net

Website and supporting API for `therestoration.jacobdanderson.net`.

## Repo Layout

- `front-end/` - Vite SSG application
- `back-end/` - Express + MongoDB API
- `HEALTHCHECKS.md` - monitor endpoints and expected `200`/`503` behavior

## Common Commands

```bash
npm install
npm run dev
npm run server
npm run serve
npm run build
npm run up
```

## Operational Notes

- The root `package-lock.json` is the authoritative lockfile for the repo. Keep it updated whenever dependencies change.
- Use `npm run server` and `npm run serve` when you want the API and front-end started separately.
- Use [`HEALTHCHECKS.md`](./HEALTHCHECKS.md) for deployment monitor targets instead of `/`.
- The public contact form now submits through the backend. Set `CONTACT_FROM_EMAIL` and either `CONTACT_USE_SENDMAIL=true` or the `CONTACT_SMTP_*` settings. If `CONTACT_TO_EMAIL` is unset, submissions default to `contacts@jacobdanderson.net`; `CONTACT_BCC_EMAIL` stays optional so future alias-plus-BCC routing is a simple env change.
