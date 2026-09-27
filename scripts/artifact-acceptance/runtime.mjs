import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { networkInterfaces } from "node:os";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";

assert.equal(process.cwd(), "/app");
assert.equal(existsSync("/source"), false, "The source checkout must be outside the artifact namespace.");
assert.equal(existsSync("/app/back-end/src"), false);
assert.equal(existsSync("/app/front-end/src"), false);
assert.equal(process.env.NODE_PATH, undefined);
assert.match(readFileSync("/proc/self/status", "utf8"), /^CapEff:\s+0+$/mu);
for (const address of Object.values(networkInterfaces()).flat()) assert.equal(address.internal, true);

const require = createRequire("/app/back-end/package.json");
for (const name of ["cypress", "eslint", "puppeteer", "tsx", "typescript", "vite", "vitest"]) {
	assert.throws(() => require.resolve(name));
}

const manifest = JSON.parse(readFileSync("/app/runtime-manifest.json", "utf8"));
const marker = JSON.parse(readFileSync("/app/.restoration-release-prepared.json", "utf8"));
const deployedAt = "2026-09-27T00:00:00Z";
const children = [];

function running(runtime) {
	return runtime.child.exitCode === null && runtime.child.signalCode === null;
}

function start() {
	const child = spawn(process.execPath, ["/app/back-end/dist/server.js"], {
		cwd: "/app",
		env: {
			PATH: "/runtime:/usr/bin:/bin",
			NODE_ENV: "production",
			HOST: "127.0.0.1",
			PORT: "19307",
			STATIC_ROOT: "/app/front-end/dist",
			TRUST_PROXY_HOPS: "1",
			RESTORATION_PUBLIC_ORIGIN: "https://therestoration.jacobdanderson.net",
			RESTORATION_RELEASE: marker.release,
			RESTORATION_COMMIT_SHA: marker.commitSha,
			RESTORATION_DEPLOYED_AT: deployedAt,
			CONTACT_FROM_EMAIL: "restoration@fixture.invalid",
			CONTACT_TO_EMAIL: "recipient@fixture.invalid",
			CONTACT_SMTP_HOST: "127.0.0.1",
			CONTACT_SMTP_PORT: "1",
			CONTACT_SMTP_SECURE: "false",
			CONTACT_SMTP_REQUIRE_TLS: "true"
		},
		stdio: ["ignore", "pipe", "pipe"]
	});
	let output = "";
	for (const stream of [child.stdout, child.stderr]) {
		stream.on("data", (chunk) => {
			output = `${output}${chunk}`.slice(-4_096);
		});
	}
	const exited = new Promise((resolve, reject) => {
		child.once("error", reject);
		child.once("exit", (code, signal) => resolve({ code, signal }));
	});
	const runtime = { child, exited, output: () => output };
	children.push(runtime);
	return runtime;
}

async function boundedExit(runtime) {
	return Promise.race([
		runtime.exited,
		delay(12_000).then(() => {
			throw new Error(`Runtime exit deadline exceeded. ${runtime.output()}`);
		})
	]);
}

async function fetchReady(path, expectedStatus = 200, init = {}) {
	let response;
	for (let attempt = 0; attempt < 80; attempt++) {
		try {
			response = await fetch(`http://127.0.0.1:19307${path}`, {
				redirect: "manual",
				signal: AbortSignal.timeout(2_000),
				...init
			});
			if (response.status === expectedStatus) return response;
			await response.arrayBuffer();
		}
		catch {
			// Bounded startup retry inside the isolated network namespace.
		}
		await delay(50);
	}
	throw new Error(`${path} did not return ${expectedStatus}; last status ${response?.status}.`);
}

async function probe(path) {
	for (const method of ["GET", "HEAD"]) {
		const response = await fetchReady(path, 200, { method });
		assert.equal(response.headers.get("cache-control"), "no-store");
		assert.equal(response.headers.get("set-cookie"), null);
		assert.equal(response.headers.get("location"), null);
		assert.equal(response.headers.get("www-authenticate"), null);
		if (method === "HEAD") assert.equal(await response.text(), "");
		else assert.deepEqual(await response.json(), { ok: true });
	}
}

try {
	if (process.argv[2] === "missing-module") {
		const broken = start();
		const result = await boundedExit(broken);
		assert.notEqual(result.code, 0);
		assert.equal(result.signal, null);
		assert.match(broken.output(), /ERR_MODULE_NOT_FOUND/u);
		assert.match(broken.output(), /contact/u);
		console.log(JSON.stringify({ negativeModule: "passed", commit: manifest.commit }));
	}
	else {
		const runtime = start();
		await probe("/healthz");
		await probe("/readyz");

		const identity = await fetchReady("/release.json");
		assert.deepEqual(await identity.json(), {
			release: marker.release,
			commitSha: marker.commitSha,
			deployedAt
		});
		const home = await fetchReady("/");
		assert.match(await home.text(), /<!doctype html>/iu);

		const crossSite = await fetchReady("/api/contact", 403, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"origin": "https://attacker.invalid",
				"sec-fetch-site": "cross-site"
			},
			body: "{}"
		});
		assert.equal((await crossSite.json()).error, "cross-site-request-denied");

		const invalid = await fetchReady("/api/contact", 400, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: "Fixture", email: "fixture@example.test", message: "short", website: "" })
		});
		assert.equal((await invalid.json()).ok, false);

		const unavailableProvider = await fetchReady("/api/contact", 502, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name: "Fixture Sender",
				email: "fixture@example.test",
				message: "Synthetic artifact contact delivery without a real provider.",
				website: ""
			})
		});
		assert.deepEqual(await unavailableProvider.json(), {
			ok: false,
			error: "The message could not be sent right now. Please try again later."
		});
		await probe("/healthz");

		runtime.child.kill("SIGTERM");
		assert.deepEqual(await boundedExit(runtime), { code: 0, signal: null }, runtime.output());

		const restarted = start();
		await probe("/healthz");
		await probe("/readyz");
		restarted.child.kill("SIGTERM");
		assert.deepEqual(await boundedExit(restarted), { code: 0, signal: null }, restarted.output());
		console.log(JSON.stringify({
			accepted: true,
			commit: manifest.commit,
			checks: [
				"compiled-entrypoint",
				"no-source-or-development-dependencies",
				"minimal-get-head-probes",
				"synthetic-provider-failure",
				"cross-site-denial",
				"graceful-shutdown",
				"restart",
				"static-assets-and-release-identity"
			]
		}));
	}
}
finally {
	for (const runtime of children) {
		if (running(runtime)) runtime.child.kill("SIGKILL");
	}
	await Promise.all(children.map(runtime => runtime.exited));
}
