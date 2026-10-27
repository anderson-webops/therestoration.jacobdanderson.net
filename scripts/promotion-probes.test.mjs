import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { it } from "vitest";
import { createApp } from "../back-end/src/app.ts";

it("accepts actual healthy API probes during promotion and rejects unavailable readiness", async () => {
	const directory = await mkdtemp(join(tmpdir(), "restoration-probes-"));
	try {
		const app = createApp({ contactSender: async () => {} });
		const health = await request(app).get("/healthz").expect(200);
		const ready = await request(app).get("/readyz").expect(200);
		const unavailable = await request(createApp()).get("/readyz").expect(503);
		const healthFile = join(directory, "health.json");
		const readyFile = join(directory, "ready.json");
		await writeFile(healthFile, health.text);
		await writeFile(readyFile, ready.text);
		const verify = () => spawnSync(process.execPath, [
			fileURLToPath(new URL("./verify-probes.mjs", import.meta.url)),
			healthFile,
			readyFile
		], { encoding: "utf8" });
		assert.equal(verify().status, 0);
		await writeFile(readyFile, unavailable.text);
		assert.equal(verify().status, 1);
		await writeFile(readyFile, "<html>Proxy error</html>");
		assert.equal(verify().status, 1);
	}
	finally {
		await rm(directory, { recursive: true, force: true });
	}
});
