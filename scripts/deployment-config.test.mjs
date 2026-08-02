import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "vitest";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

it("uses one loopback-bound application origin in production", async () => {
	const [compose, nginx, dockerfile] = await Promise.all([
		read("docker-compose.yml"),
		read("deploy/nginx/therestoration.locations.conf"),
		read("Dockerfile")
	]);

	assert.match(compose, /127\.0\.0\.1:3007:3007/);
	assert.match(compose, /TRUST_PROXY_HOPS: 1/);
	assert.match(compose, /RESTORATION_RELEASE: \$\{RESTORATION_RELEASE:\?/);
	assert.match(compose, /RESTORATION_COMMIT_SHA: \$\{RESTORATION_COMMIT_SHA:\?/);
	assert.match(compose, /RESTORATION_DEPLOYED_AT: \$\{RESTORATION_DEPLOYED_AT:\?/);
	assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:3007;/);
	assert.match(nginx, /proxy_set_header X-Forwarded-For \$remote_addr;/);
	assert.doesNotMatch(nginx, /\$proxy_add_x_forwarded_for/);
	assert.doesNotMatch(nginx, /root\s+\/|alias\s+\//);
	assert.match(dockerfile, /rm -rf \/usr\/local\/lib\/node_modules\/npm/);
});

it("preserves A and AAAA records in operator guidance", async () => {
	const handoff = await read("deploy/README.md");
	assert.match(handoff, /Preserve both address families/);
	assert.match(handoff, /A\s+or AAAA records/);
	assert.doesNotMatch(handoff, /remove (?:the )?AAAA|delete (?:the )?AAAA|disable IPv6/i);
});
