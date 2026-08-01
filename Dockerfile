# syntax=docker/dockerfile:1.7

FROM node:24.18.1-alpine3.24@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS dependencies

ARG NPM_VERSION=12.0.2
WORKDIR /app
RUN npm install --global "npm@${NPM_VERSION}"

COPY package.json package-lock.json .npmrc ./
COPY front-end/package.json ./front-end/package.json
COPY back-end/package.json ./back-end/package.json
COPY scripts/check-native-bindings.mjs ./scripts/check-native-bindings.mjs
RUN --mount=type=cache,id=restoration-npm-cache,target=/root/.npm \
	node scripts/check-native-bindings.mjs \
	&& CYPRESS_INSTALL_BINARY=0 PUPPETEER_SKIP_DOWNLOAD=true npm ci

FROM dependencies AS builder

COPY . .
RUN npm run build

FROM node:24.18.1-alpine3.24@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS production-dependencies

ARG NPM_VERSION=12.0.2
WORKDIR /app
RUN npm install --global "npm@${NPM_VERSION}"

COPY package.json package-lock.json .npmrc ./
COPY front-end/package.json ./front-end/package.json
COPY back-end/package.json ./back-end/package.json
COPY scripts/prune-production-node-modules.mjs ./scripts/prune-production-node-modules.mjs
RUN --mount=type=cache,id=restoration-npm-production-cache,target=/root/.npm \
	npm ci --omit=dev --ignore-scripts --workspace back-end --include-workspace-root=false \
	&& npm audit --omit=dev --audit-level=low \
	&& npm query '.dev:not(.prod), :extraneous' --json > production-prune.json \
	&& node scripts/prune-production-node-modules.mjs production-prune.json

FROM node:24.18.1-alpine3.24@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS runner

ARG VCS_REF=local
WORKDIR /app

ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3007
ENV STATIC_ROOT=/app/front-end/dist

LABEL org.opencontainers.image.description="The Restoration public site and contact API" \
	org.opencontainers.image.revision="${VCS_REF}" \
	org.opencontainers.image.source="https://github.com/anderson-webops/therestoration.jacobdanderson.net" \
	org.opencontainers.image.version="4.0.0"

RUN addgroup --system --gid 1001 restoration \
	&& adduser --system --uid 1001 --ingroup restoration restoration \
	&& rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
	&& rm -f \
		/usr/local/bin/corepack \
		/usr/local/bin/npm \
		/usr/local/bin/npx \
		/usr/local/bin/pnpm \
		/usr/local/bin/pnpx

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=builder /app/back-end/dist ./back-end/dist
COPY --from=builder /app/back-end/package.json ./back-end/package.json
COPY --from=builder /app/front-end/dist ./front-end/dist

USER restoration

EXPOSE 3007

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD ["node", "-e", "fetch('http://127.0.0.1:3007/readyz').then(response => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "back-end/dist/server.js"]
