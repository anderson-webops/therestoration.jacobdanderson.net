import process from "node:process";

const baseUrl = new URL(
	process.env.VERIFY_RESTORATION_BASE_URL || "https://therestoration.jacobdanderson.net"
);
const expectedRelease = process.env.VERIFY_RESTORATION_EXPECT_RELEASE?.trim() || "";
const expectedCommit = process.env.VERIFY_RESTORATION_EXPECT_COMMIT?.trim() || "";

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

async function request(path, init = {}) {
	const response = await fetch(new URL(path, baseUrl), {
		redirect: "error",
		signal: AbortSignal.timeout(15_000),
		...init
	});
	const text = await response.text();
	let body;
	try {
		body = text ? JSON.parse(text) : undefined;
	}
	catch {
		body = undefined;
	}
	return { response, text, body };
}

function assertIdentity(identity, label) {
	assert(identity?.release === expectedRelease, `${label} release must be ${expectedRelease}`);
	assert(identity?.commitSha === expectedCommit, `${label} commit must be ${expectedCommit}`);
	assert(
		typeof identity?.deployedAt === "string" && !Number.isNaN(Date.parse(identity.deployedAt)),
		`${label} must include a valid deployment timestamp`
	);
}

function assertSecurityHeaders(response, label) {
	const csp = response.headers.get("content-security-policy") || "";
	assert(csp.includes("frame-ancestors 'none'"), `${label} CSP must deny framing`);
	assert(!csp.includes("'unsafe-eval'"), `${label} CSP must prohibit unsafe-eval`);
	assert(response.headers.get("x-frame-options") === "DENY", `${label} must deny framing`);
	assert(response.headers.get("x-content-type-options") === "nosniff", `${label} must disable sniffing`);
	assert(response.headers.get("strict-transport-security")?.includes("max-age="), `${label} must use HSTS`);
	assert(!response.headers.has("x-powered-by"), `${label} must not expose Express`);
}

assert(/^v\d+\.\d+\.\d+/.test(expectedRelease), "VERIFY_RESTORATION_EXPECT_RELEASE is required");
assert(/^[0-9a-f]{40}$/.test(expectedCommit), "VERIFY_RESTORATION_EXPECT_COMMIT is required");

const [home, health, readiness, release, reserved] = await Promise.all([
	request("/"),
	request("/healthz"),
	request("/readyz"),
	request("/release.json"),
	request("/admin")
]);

assert(home.response.status === 200 && /<!doctype html/i.test(home.text), "/ must serve the application");
assert(health.response.status === 200 && health.body?.ok === true, "/healthz must report liveness");
assert(readiness.response.status === 200 && readiness.body?.ready === true, "/readyz must report readiness");
assert(release.response.status === 200, "/release.json must return 200");
assert(reserved.response.status === 404 && reserved.body?.error === "not-found", "/admin must not use the SPA fallback");

assertIdentity(health.body?.deployment, "/healthz");
assertIdentity(readiness.body?.deployment, "/readyz");
assertIdentity(release.body, "/release.json");
assert(health.response.headers.get("cache-control") === "no-store", "/healthz must be no-store");
assert(readiness.response.headers.get("cache-control") === "no-store", "/readyz must be no-store");
assert(release.response.headers.get("cache-control") === "no-store", "/release.json must be no-store");
for (const [label, response] of [["/", home.response], ["/healthz", health.response], ["/readyz", readiness.response]]) {
	assertSecurityHeaders(response, label);
}

const blockedWrite = await request("/api/contact", {
	body: JSON.stringify({
		name: "Security verifier",
		email: "verifier@example.com",
		message: "This request must be rejected before delivery.",
		website: ""
	}),
	headers: {
		"content-type": "application/json",
		"origin": "https://attacker.invalid",
		"sec-fetch-site": "cross-site"
	},
	method: "POST"
});
assert(blockedWrite.response.status === 403, "cross-site contact submission must be rejected");
assert(blockedWrite.body?.error === "cross-site-request-denied", "cross-site rejection must be explicit");
assertSecurityHeaders(blockedWrite.response, "/api/contact");

console.log(`Verified ${expectedRelease} (${expectedCommit}) at ${baseUrl.origin}.`);
