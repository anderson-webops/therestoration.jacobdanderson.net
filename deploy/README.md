# Production rollout

The v4 production boundary is one loopback-bound Node container. It serves the
static application, contact API, health endpoints, and exact release identity.
Do not deploy `front-end/dist` through a separate host-level static location.

1. Check out the exact release commit on the host.
2. Set `RESTORATION_RELEASE=v4.0.0`, the full lowercase
   `RESTORATION_COMMIT_SHA`, and an ISO-8601 `RESTORATION_DEPLOYED_AT` value.
3. Build and start the Compose service. The required identity variables make
   Compose and the production process fail closed when a rollout is anonymous.
4. Replace the host's old static `location /` block with
   `deploy/nginx/therestoration.locations.conf`, test the complete Nginx
   configuration, and reload Nginx.
5. Verify the public site with the exact release and revision:

```bash
VERIFY_RESTORATION_EXPECT_RELEASE=v4.0.0 \
VERIFY_RESTORATION_EXPECT_COMMIT=<full-40-character-commit> \
npm run verify:public
```

The include does not modify DNS, certificates, firewall rules, or existing A
or AAAA records. Preserve both address families and repair host listeners,
certificate coverage, routing, or firewall policy if either family fails.
