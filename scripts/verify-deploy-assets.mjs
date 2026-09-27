import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

for (const removedPath of ["Dockerfile", ".dockerignore", "docker-compose.yml", "compose.yaml"]) {
	await assert.rejects(access(new URL(`../${removedPath}`, import.meta.url)), undefined, `${removedPath} must be absent.`);
}

const [service, prepare, promote, install, legacySeal, trustedPaths, artifactBuilder, artifactAcceptance, artifactContract, nginx, runbook, mainCi, packageManifest, backendPackage] = await Promise.all([
	read("deploy/systemd/restoration-app.service"),
	read("deploy/systemd/prepare-release.sh"),
	read("deploy/systemd/promote-release.sh"),
	read("deploy/systemd/install-service.sh"),
	read("deploy/systemd/seal-v4.0.4-rollback.sh"),
	read("deploy/systemd/trusted-paths.py"),
	read("scripts/build-arm64-release.sh"),
	read("scripts/test-unpacked-artifact.sh"),
	read("deploy/runtime-artifact.json"),
	read("deploy/nginx/therestoration.locations.conf"),
	read("deploy/README.md"),
	read(".github/workflows/ci.yml"),
	read("package.json"),
	read("back-end/package.json")
]);

assert.match(service, /^User=restoration$/mu);
assert.match(service, /^Group=restoration$/mu);
assert.match(service, /^Environment=HOST=127\.0\.0\.1$/mu);
assert.match(service, /^Environment=PORT=3007$/mu);
assert.match(service, /^ExecStart=\/usr\/bin\/node back-end\/dist\/server\.js$/mu);
assert.match(service, /^NoNewPrivileges=true$/mu);
assert.match(service, /^ProtectSystem=strict$/mu);
assert.match(service, /^CapabilityBoundingSet=$/mu);
assert.match(service, /^MemoryHigh=160M$/mu);
assert.match(service, /^MemoryMax=192M$/mu);
assert.match(service, /^MemorySwapMax=0$/mu);
assert.match(service, /^TasksMax=32$/mu);
assert.match(service, /^LimitNOFILE=512$/mu);
assert.doesNotMatch(service, /0\.0\.0\.0|npm|npx|docker/iu);

assert.match(prepare, /build-arm64-release\.sh/u);
assert.doesNotMatch(prepare, /npm ci|git fetch|node_modules/u);
assert.match(artifactBuilder, /npm ci --include=dev --include=optional --strict-allow-scripts/u);
assert.match(artifactBuilder, /npm audit signatures/u);
assert.match(artifactBuilder, /runtime-artifact\.py pack/u);
assert.match(artifactBuilder, /test-unpacked-artifact\.sh/u);
assert.doesNotMatch(artifactBuilder, /test:promotion/u);
assert.match(artifactAcceptance, /--setenv NODE_OPTIONS --max-old-space-size=96/u);
assert.match(artifactAcceptance, /--setenv UV_THREADPOOL_SIZE 2/u);
assert.doesNotMatch(artifactAcceptance, /--setenv [A-Z_]+=/u);
assert.match(mainCi, /npm run test:promotion/u);
assert.match(promote, /127\.0\.0\.1:3007\/readyz/u);
assert.match(promote, /runtime-artifact\.py/u);
assert.match(promote, /unpack "\$stage"/u);
assert.match(promote, /trusted-paths\.py/u);
assert.match(promote, /--ipv4/u);
assert.match(promote, /--ipv6/u);
assert.match(promote, /cross-site/u);
assert.match(promote, /restoring the independently verified previous release/iu);
assert.doesNotMatch(promote, /systemctl reload nginx/u);
assert.match(install, /useradd --system/u);
assert.match(install, /\/usr\/local\/libexec\/therestoration-release/u);
assert.match(install, /root "\$service_gid" 0750/u);
assert.match(legacySeal, /396f75b089d1e8c4f60f349d43ec426a80a3a1db/u);
assert.match(legacySeal, /systemctl stop/u);
assert.match(legacySeal, /compare-source/u);
assert.match(trustedPaths, /metadata\.st_uid != 0/u);
assert.match(trustedPaths, /metadata\.st_mode & 0o022/u);

const contract = JSON.parse(artifactContract);
assert.deepEqual(contract.entrypoints, ["back-end/dist/server.js"]);
assert.ok(contract.required.includes("back-end/dist/boundedRateStore.js"));
assert.ok(contract.allowedRoots.includes("back-end/node_modules"));
assert.deepEqual(contract.nativeBindings, []);

assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:3007;/u);
assert.match(nginx, /proxy_set_header X-Forwarded-For \$remote_addr;/u);
assert.doesNotMatch(nginx, /\$proxy_add_x_forwarded_for/u);
assert.doesNotMatch(nginx, /root\s+\/|alias\s+\//u);

assert.match(runbook, /does\s+not use Docker/u);
assert.match(runbook, /Preserve both address families/u);
assert.match(runbook, /A or AAAA records/u);
assert.doesNotMatch(runbook, /remove (?:the )?AAAA|delete (?:the )?AAAA|disable IPv6/iu);

const manifest = JSON.parse(packageManifest);
const backendManifest = JSON.parse(backendPackage);
assert.equal(manifest.scripts["verify:production-install"], "node scripts/verify-production-install.mjs");
assert.equal(manifest.scripts["test:direct-runtime"], "node scripts/direct-runtime-smoke.mjs");
assert.equal(manifest.scripts["test:runtime-artifact"], "python3 -B -m unittest scripts/test_runtime_artifact.py -v");
assert.equal(manifest.scripts["test:promotion"], "bash scripts/test-promotion-recovery.sh");
assert.equal(manifest.scripts["package:runtime"], "bash scripts/build-arm64-release.sh");
assert.match(backendManifest.scripts.clean, /tsconfig\.tsbuildinfo/u);

console.log("Direct deployment assets enforce a loopback service, hardened systemd, exact identity, and Docker-free production.");
