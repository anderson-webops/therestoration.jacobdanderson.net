import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { it } from "vitest";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

it("uses one hardened loopback-bound direct application service in production", async () => {
	const [service, nginx, prepare, promote, install, contract] = await Promise.all([
		read("deploy/systemd/restoration-app.service"),
		read("deploy/nginx/therestoration.locations.conf"),
		read("deploy/systemd/prepare-release.sh"),
		read("deploy/systemd/promote-release.sh"),
		read("deploy/systemd/install-service.sh"),
		read("deploy/runtime-artifact.json")
	]);

	assert.match(service, /^User=restoration$/mu);
	assert.match(service, /^Environment=HOST=127\.0\.0\.1$/mu);
	assert.match(service, /^Environment=PORT=3007$/mu);
	assert.match(service, /^NoNewPrivileges=true$/mu);
	assert.match(service, /^ProtectSystem=strict$/mu);
	assert.match(service, /^MemoryMax=192M$/mu);
	assert.match(service, /^TasksMax=32$/mu);
	assert.doesNotMatch(service, /0\.0\.0\.0|docker/iu);
	assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:3007;/u);
	assert.match(nginx, /proxy_set_header X-Forwarded-For \$remote_addr;/u);
	assert.doesNotMatch(nginx, /\$proxy_add_x_forwarded_for/u);
	assert.doesNotMatch(nginx, /root\s+\/|alias\s+\//u);
	assert.match(prepare, /build-arm64-release\.sh/u);
	assert.match(install, /\/usr\/local\/libexec\/therestoration-release/u);
	assert.match(promote, /"\$artifact_verifier" unpack/u);
	assert.match(promote, /Existing release lacks valid root-protected rollback provenance/u);
	assert.doesNotMatch(promote, /systemctl reload nginx/u);
	assert.match(promote, /if \[\[ -L "\$current_link" \]\]; then/u);
	assert.match(promote, /--ipv4/u);
	assert.match(promote, /--ipv6/u);
	assert.deepEqual(JSON.parse(contract).nativeBindings, []);
	for (const removedPath of ["Dockerfile", ".dockerignore", "docker-compose.yml", "compose.yaml"]) {
		await assert.rejects(access(new URL(`../${removedPath}`, import.meta.url)));
	}
});

it("preserves A and AAAA records in operator guidance", async () => {
	const handoff = await read("deploy/README.md");
	assert.match(handoff, /Preserve both address families/u);
	assert.match(handoff, /A or AAAA records/u);
	assert.doesNotMatch(handoff, /remove (?:the )?AAAA|delete (?:the )?AAAA|disable IPv6/iu);
});
