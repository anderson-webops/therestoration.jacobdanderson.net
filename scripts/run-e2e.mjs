#!/usr/bin/env node
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import process from "node:process";

const projectRoot = resolve(import.meta.dirname, "..");
const frontendRoot = resolve(projectRoot, "front-end");
const baseUrl = "http://127.0.0.1:3333";
const viteCli = resolve(projectRoot, "node_modules/vite/bin/vite.js");
const cypressCli = resolve(projectRoot, "node_modules/cypress/bin/cypress");

function waitForExit(child) {
	return new Promise((resolveExit) => {
		child.once("exit", (code, signal) => resolveExit({ code, signal }));
	});
}

async function waitForHttp(child, timeoutMs = 30_000) {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		if (child.exitCode !== null || child.signalCode !== null) {
			throw new Error("The Vite preview exited before it became ready.");
		}
		try {
			const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2_000) });
			if (response.ok) return;
		}
		catch {
			// The preview may still be starting.
		}
		await new Promise(resolveWait => setTimeout(resolveWait, 250));
	}
	throw new Error(`Timed out waiting for ${baseUrl}.`);
}

async function stop(child) {
	if (child.exitCode !== null || child.signalCode !== null) return;
	child.kill("SIGTERM");
	const exited = await Promise.race([
		waitForExit(child).then(() => true),
		new Promise(resolveWait => setTimeout(resolveWait, 5_000, false))
	]);
	if (!exited && child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
}

const preview = spawn(process.execPath, [viteCli, "preview", "--host", "127.0.0.1", "--port", "3333", "--strictPort"], {
	cwd: frontendRoot,
	env: { ...process.env, BROWSER: "none" },
	stdio: ["ignore", "inherit", "inherit"]
});

let exitCode = 1;
try {
	await waitForHttp(preview);
	const cypress = spawn(process.execPath, [cypressCli, "run"], {
		cwd: frontendRoot,
		env: { ...process.env, CYPRESS_BASE_URL: baseUrl },
		stdio: "inherit"
	});
	const result = await waitForExit(cypress);
	exitCode = result.code ?? 1;
}
catch (error) {
	console.error(error instanceof Error ? error.message : "The browser test runner failed.");
}
finally {
	await stop(preview);
}

process.exitCode = exitCode;
