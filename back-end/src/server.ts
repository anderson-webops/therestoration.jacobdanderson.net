import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process, { env, exit } from "node:process";
import { fileURLToPath } from "node:url";

import { createApp } from "./app.js";
import { createContactSender } from "./contact.js";
import { parseDeploymentIdentity, parsePublicOrigin } from "./deployment.js";
import "dotenv/config";

function parseBoundedInteger(name: string, value: string | undefined, minimum: number, maximum: number) {
	const number = Number(value);
	if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
		throw new TypeError(`${name} must be an integer between ${minimum} and ${maximum}.`);
	}
	return number;
}

async function main() {
	const isProduction = env.NODE_ENV === "production";
	if (isProduction && !env.TRUST_PROXY_HOPS) {
		throw new Error("TRUST_PROXY_HOPS is required in production.");
	}

	const port = parseBoundedInteger("PORT", env.PORT || "3007", 1, 65_535);
	const trustProxyHops = parseBoundedInteger(
		"TRUST_PROXY_HOPS",
		env.TRUST_PROXY_HOPS || "0",
		0,
		3
	);
	const host = env.HOST?.trim() || "127.0.0.1";
	const currentDirectory = dirname(fileURLToPath(import.meta.url));
	const staticRoot = resolve(env.STATIC_ROOT || resolve(currentDirectory, "../../front-end/dist"));
	await access(resolve(staticRoot, "index.html"), constants.R_OK);
	const packageMetadata = JSON.parse(
		await readFile(resolve(currentDirectory, "../package.json"), "utf8")
	) as { version?: unknown };
	if (typeof packageMetadata.version !== "string") {
		throw new TypeError("The back-end package version is missing.");
	}
	const deployment = parseDeploymentIdentity(env, `v${packageMetadata.version}`);
	const publicOrigin = parsePublicOrigin(env.RESTORATION_PUBLIC_ORIGIN, isProduction);

	const app = createApp({
		contactSender: createContactSender(env),
		deployment,
		publicOrigin,
		staticRoot,
		trustProxyHops
	});
	const server = app.listen(port, host, () => {
		console.log(`The Restoration is listening on ${host}:${port}.`);
	});
	server.headersTimeout = 15_000;
	server.requestTimeout = 30_000;
	server.keepAliveTimeout = 5_000;
	server.maxRequestsPerSocket = 100;
	let isShuttingDown = false;

	async function shutdown(signal: NodeJS.Signals) {
		if (isShuttingDown) return;
		isShuttingDown = true;
		console.log(`${signal} received; shutting down.`);

		const forceTimer = setTimeout(() => {
			console.error("Graceful shutdown timed out.");
			exit(1);
		}, 10_000);
		forceTimer.unref();

		server.close((error) => {
			clearTimeout(forceTimer);
			if (error) {
				console.error("Graceful shutdown failed.");
				exit(1);
			}
			exit(0);
		});
	}

	process.once("SIGINT", () => void shutdown("SIGINT"));
	process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : "The service could not start.");
	exit(1);
});
