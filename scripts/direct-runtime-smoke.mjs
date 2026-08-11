import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const marker = JSON.parse(
	await readFile(path.join(repositoryRoot, ".restoration-release-prepared.json"), "utf8")
);

async function reservePort() {
	const server = net.createServer();
	await new Promise((resolveListen, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolveListen);
	});
	const address = server.address();
	assert.ok(address && typeof address === "object");
	await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
	return address.port;
}

function processIsRunning(child) {
	return child.exitCode === null && child.signalCode === null;
}

async function stopProcessTree(child) {
	if (!child.pid || !processIsRunning(child)) return;
	const target = process.platform === "win32" ? child.pid : -child.pid;
	try {
		process.kill(target, "SIGTERM");
	}
	catch (error) {
		if (error?.code !== "ESRCH") throw error;
		return;
	}
	await Promise.race([
		new Promise(resolveExit => child.once("exit", resolveExit)),
		new Promise(resolveWait => setTimeout(resolveWait, 5_000))
	]);
	if (!processIsRunning(child)) return;
	try {
		process.kill(target, "SIGKILL");
	}
	catch (error) {
		if (error?.code !== "ESRCH") throw error;
	}
}

async function waitForReady(baseUrl, child, diagnosticOutput) {
	const deadline = Date.now() + 20_000;
	let lastError;
	while (Date.now() < deadline) {
		if (!processIsRunning(child)) {
			throw new Error(`The direct runtime exited before readiness. ${diagnosticOutput()}`);
		}
		try {
			const response = await fetch(`${baseUrl}/readyz`, { signal: AbortSignal.timeout(2_000) });
			if (response.ok) return;
			lastError = new Error(`/readyz returned ${response.status}`);
		}
		catch (error) {
			lastError = error;
		}
		await new Promise(resolveWait => setTimeout(resolveWait, 250));
	}
	throw new Error(`Direct runtime did not become ready: ${lastError?.message ?? "unknown error"}. ${diagnosticOutput()}`);
}

async function requestJson(baseUrl, requestPath, init) {
	const response = await fetch(`${baseUrl}${requestPath}`, {
		signal: AbortSignal.timeout(5_000),
		...init
	});
	return { response, body: await response.json() };
}

const port = await reservePort();
const baseUrl = `http://127.0.0.1:${port}`;
let diagnostics = "";
const child = spawn(process.execPath, ["back-end/dist/server.js"], {
	cwd: repositoryRoot,
	detached: process.platform !== "win32",
	env: {
		...process.env,
		NODE_ENV: "production",
		HOST: "127.0.0.1",
		PORT: String(port),
		STATIC_ROOT: path.join(repositoryRoot, "front-end/dist"),
		TRUST_PROXY_HOPS: "1",
		RESTORATION_PUBLIC_ORIGIN: "https://therestoration.jacobdanderson.net",
		RESTORATION_RELEASE: marker.release,
		RESTORATION_COMMIT_SHA: marker.commitSha,
		RESTORATION_DEPLOYED_AT: marker.deployedAt,
		CONTACT_FROM_EMAIL: "restoration@example.test",
		CONTACT_TO_EMAIL: "contact@example.test",
		CONTACT_SMTP_HOST: "127.0.0.1",
		CONTACT_SMTP_PORT: "2525",
		CONTACT_SMTP_SECURE: "false",
		CONTACT_SMTP_REQUIRE_TLS: "true",
		CONTACT_SMTP_USER: "",
		CONTACT_SMTP_PASS: ""
	},
	stdio: ["ignore", "pipe", "pipe"]
});
for (const stream of [child.stdout, child.stderr]) {
	stream.on("data", (data) => {
		diagnostics = `${diagnostics}${data.toString()}`.slice(-4_000);
	});
}

try {
	await waitForReady(baseUrl, child, () => diagnostics.trim());

	const health = await requestJson(baseUrl, "/healthz");
	assert.equal(health.response.status, 200);
	assert.deepEqual(health.body, { ok: true });
	assert.equal(health.response.headers.get("cache-control"), "no-store");
	assert.equal(health.response.headers.get("set-cookie"), null);

	const readiness = await requestJson(baseUrl, "/readyz");
	assert.equal(readiness.response.status, 200);
	assert.deepEqual(readiness.body, { ok: true });

	for (const probe of ["/healthz", "/readyz"]) {
		const response = await fetch(`${baseUrl}${probe}`, {
			method: "HEAD",
			signal: AbortSignal.timeout(5_000)
		});
		assert.equal(response.status, 200);
		assert.equal(await response.text(), "");
	}

	const release = await requestJson(baseUrl, "/release.json");
	assert.equal(release.response.status, 200);
	assert.deepEqual(release.body, marker);

	const home = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(5_000) });
	assert.equal(home.status, 200);
	assert.match(await home.text(), /<!doctype html>/iu);
	const csp = home.headers.get("content-security-policy") ?? "";
	assert.match(csp, /frame-ancestors 'none'/u);
	assert.doesNotMatch(csp, /'unsafe-eval'/u);
	assert.equal(home.headers.get("x-content-type-options"), "nosniff");
	assert.equal(home.headers.get("x-frame-options"), "DENY");

	const crossSite = await requestJson(baseUrl, "/api/contact", {
		body: "{}",
		headers: {
			"content-type": "application/json",
			"origin": "https://attacker.example",
			"sec-fetch-site": "cross-site"
		},
		method: "POST"
	});
	assert.equal(crossSite.response.status, 403);
	assert.equal(crossSite.body.error, "cross-site-request-denied");

	const reserved = await requestJson(baseUrl, "/admin");
	assert.equal(reserved.response.status, 404);
	assert.equal(reserved.body.error, "not-found");

	console.log(JSON.stringify({
		directRuntime: "passed",
		release: marker.release,
		commitSha: marker.commitSha,
		ready: true,
		crossSiteMutations: "denied"
	}));
}
finally {
	await stopProcessTree(child);
}
