import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

for (const removedPath of ["Dockerfile", ".dockerignore", "docker-compose.yml", "compose.yaml"]) {
	await assert.rejects(access(new URL(`../${removedPath}`, import.meta.url)), undefined, `${removedPath} must be absent.`);
}

const [service, prepare, promote, install, nginx, runbook, packageManifest] = await Promise.all([
	read("deploy/systemd/restoration-app.service"),
	read("deploy/systemd/prepare-release.sh"),
	read("deploy/systemd/promote-release.sh"),
	read("deploy/systemd/install-service.sh"),
	read("deploy/nginx/therestoration.locations.conf"),
	read("deploy/README.md"),
	read("package.json")
]);

assert.match(service, /^User=restoration$/mu);
assert.match(service, /^Group=restoration$/mu);
assert.match(service, /^Environment=HOST=127\.0\.0\.1$/mu);
assert.match(service, /^Environment=PORT=3007$/mu);
assert.match(service, /^ExecStart=\/usr\/bin\/node back-end\/dist\/server\.js$/mu);
assert.match(service, /^NoNewPrivileges=true$/mu);
assert.match(service, /^ProtectSystem=strict$/mu);
assert.match(service, /^CapabilityBoundingSet=$/mu);
assert.doesNotMatch(service, /0\.0\.0\.0|npm|npx|docker/iu);

assert.match(prepare, /npm ci --include=dev --include=optional --strict-allow-scripts/u);
assert.match(prepare, /npm audit signatures/u);
assert.match(prepare, /npm ci --omit=dev --include=optional --workspace back-end/u);
assert.match(prepare, /prune-production-dependencies\.mjs/u);
assert.match(prepare, /v\$RESTORATION_VERSION/u);
assert.match(prepare, /origin\/main/u);
assert.match(promote, /127\.0\.0\.1:3007\/readyz/u);
assert.match(promote, /--ipv4/u);
assert.match(promote, /--ipv6/u);
assert.match(promote, /cross-site/u);
assert.match(promote, /restoring the previous direct release/iu);
assert.match(install, /useradd --system/u);

assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:3007;/u);
assert.match(nginx, /proxy_set_header X-Forwarded-For \$remote_addr;/u);
assert.doesNotMatch(nginx, /\$proxy_add_x_forwarded_for/u);
assert.doesNotMatch(nginx, /root\s+\/|alias\s+\//u);

assert.match(runbook, /does not use Docker/u);
assert.match(runbook, /Preserve both address families/u);
assert.match(runbook, /A or AAAA records/u);
assert.doesNotMatch(runbook, /remove (?:the )?AAAA|delete (?:the )?AAAA|disable IPv6/iu);

const manifest = JSON.parse(packageManifest);
assert.equal(manifest.scripts["verify:production-install"], "node scripts/verify-production-install.mjs");
assert.equal(manifest.scripts["test:direct-runtime"], "node scripts/direct-runtime-smoke.mjs");

console.log("Direct deployment assets enforce a loopback service, hardened systemd, exact identity, and Docker-free production.");
