import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { afterAll, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";

const validContact = {
	name: "Restoration Visitor",
	email: "visitor@example.com",
	message: "I enjoyed learning from the site.",
	website: ""
};
const temporaryDirectories: string[] = [];
const deployment = {
	release: "v4.0.1",
	commitSha: "0123456789abcdef0123456789abcdef01234567",
	deployedAt: "2026-08-02T00:00:00.000Z"
};

afterAll(async () => {
	await Promise.all(
		temporaryDirectories.map(directory => rm(directory, { force: true, recursive: true }))
	);
});

describe("the Restoration application", () => {
	it("serves hardened health and readiness responses without sessions", async () => {
		const sender = vi.fn().mockResolvedValue(undefined);
		const app = createApp({ contactSender: sender, deployment });

		const health = await request(app).get("/healthz").expect(200, { ok: true });
		expect(health.headers["cache-control"]).toBe("no-store");
		expect(health.headers["content-security-policy"]).toContain(
			"https://analytics.jacobdanderson.net"
		);
		expect(health.headers["x-content-type-options"]).toBe("nosniff");
		expect(health.headers["x-frame-options"]).toBe("DENY");
		expect(health.headers["x-powered-by"]).toBeUndefined();
		expect(health.headers["set-cookie"]).toBeUndefined();
		expect(health.headers.location).toBeUndefined();
		expect(health.headers["www-authenticate"]).toBeUndefined();
		expect(health.headers["access-control-allow-origin"]).toBeUndefined();

		const healthHead = await request(app).head("/healthz").expect(200);
		expect(healthHead.text).toBeUndefined();
		await request(app).get("/readyz").expect(200, { ok: true });
		const readyHead = await request(app).head("/readyz").expect(200);
		expect(readyHead.text).toBeUndefined();
		await request(createApp()).get("/readyz").expect(503, { ok: false });
		const unavailableHead = await request(createApp()).head("/readyz").expect(503);
		expect(unavailableHead.text).toBeUndefined();
		await request(app).get("/release.json").expect(200, deployment);
	});

	it("validates and sends bounded contact submissions", async () => {
		const sender = vi.fn().mockResolvedValue(undefined);
		const app = createApp({ contactSender: sender });

		await request(app)
			.post("/api/contact")
			.send({ ...validContact, name: "  Restoration Visitor  " })
			.expect(202, { ok: true });

		expect(sender).toHaveBeenCalledOnce();
		expect(sender.mock.calls[0]?.[0]).toMatchObject({
			name: "Restoration Visitor",
			email: validContact.email,
			message: validContact.message
		});
	});

	it("silently accepts honeypot submissions without sending mail", async () => {
		const sender = vi.fn().mockResolvedValue(undefined);
		const app = createApp({ contactSender: sender });

		await request(app)
			.post("/api/contact")
			.send({ ...validContact, website: "https://spam.example" })
			.expect(202, { ok: true });
		expect(sender).not.toHaveBeenCalled();
	});

	it("rejects browser cross-site contact submissions before delivery", async () => {
		const sender = vi.fn().mockResolvedValue(undefined);
		const app = createApp({
			contactSender: sender,
			publicOrigin: "https://therestoration.jacobdanderson.net"
		});

		await request(app)
			.post("/api/contact")
			.set("Origin", "https://attacker.invalid")
			.set("Sec-Fetch-Site", "cross-site")
			.send(validContact)
			.expect(403, { ok: false, error: "cross-site-request-denied" });
		expect(sender).not.toHaveBeenCalled();

		await request(app)
			.post("/api/contact")
			.set("Origin", "https://therestoration.jacobdanderson.net")
			.set("Sec-Fetch-Site", "same-origin")
			.send(validContact)
			.expect(202, { ok: true });
		expect(sender).toHaveBeenCalledOnce();
	});

	it("rejects invalid, malformed, oversized, and unexpected input", async () => {
		const app = createApp({ contactSender: vi.fn().mockResolvedValue(undefined) });

		await request(app)
			.post("/api/contact")
			.send({ ...validContact, message: "short" })
			.expect(400);
		await request(app)
			.post("/api/contact")
			.send({ ...validContact, unexpected: true })
			.expect(400);
		await request(app)
			.post("/api/contact")
			.set("Content-Type", "text/plain")
			.send(JSON.stringify(validContact))
			.expect(415, { ok: false, error: "content-type-must-be-application-json" });
		await request(app)
			.post("/api/contact")
			.set("Content-Type", "application/json")
			.send("{")
			.expect(400, { ok: false, error: "invalid-json" });
		await request(app)
			.post("/api/contact")
			.send({ ...validContact, message: "x".repeat(17_000) })
			.expect(413, { ok: false, error: "request-too-large" });
	});

	it("fails closed when contact delivery is not configured", async () => {
		await request(createApp()).post("/api/contact").send(validContact).expect(503, {
			ok: false,
			error: "The contact form is not configured on the server yet."
		});
	});

	it("rate limits repeated contact submissions", async () => {
		const app = createApp({
			contactSender: vi.fn().mockResolvedValue(undefined),
			contactRateLimit: 2
		});

		await request(app).post("/api/contact").send(validContact).expect(202);
		await request(app).post("/api/contact").send(validContact).expect(202);
		await request(app).post("/api/contact").send(validContact).expect(429);
	});

	it("does not expose internal delivery errors", async () => {
		const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		const app = createApp({
			contactSender: vi.fn().mockRejectedValue(new Error("SMTP password rejected"))
		});

		const response = await request(app).post("/api/contact").send(validContact).expect(502);
		expect(response.body).toEqual({
			ok: false,
			error: "The message could not be sent right now. Please try again later."
		});
		expect(JSON.stringify(response.body)).not.toContain("SMTP");
		logSpy.mockRestore();
	});

	it("removes the dormant account and database-diagnostics surface", async () => {
		const app = createApp();
		await request(app).get("/accounts/me").expect(404, { ok: false, error: "not-found" });
		await request(app).get("/_dbinfo").expect(404, { ok: false, error: "not-found" });
		await request(app).post("/accounts/admin").send({ role: "admin" }).expect(404);
	});

	it("keeps missing pages usable when a deployment lacks the generated 404 file", async () => {
		const staticRoot = await mkdtemp(join(tmpdir(), "restoration-old-static-"));
		temporaryDirectories.push(staticRoot);
		await writeFile(join(staticRoot, "index.html"), "<!doctype html><title>Older front end</title>");
		const app = createApp({ staticRoot });
		const response = await request(app).get("/missing-page").set("Accept", "text/html").expect(404);
		expect(response.text).toContain("Page not found");
		expect(response.text).toContain("href=\"/\"");
		expect(response.text).toContain("noindex,nofollow");
		const head = await request(app).head("/missing-page").set("Accept", "text/html").expect(404);
		expect(head.text).toBeUndefined();
	});

	it("serves real pages and returns honest HTML or JSON 404 responses", async () => {
		const staticRoot = await mkdtemp(join(tmpdir(), "restoration-static-"));
		temporaryDirectories.push(staticRoot);
		await writeFile(join(staticRoot, "index.html"), "<!doctype html><title>Restoration</title>");
		await writeFile(join(staticRoot, "about.html"), "<!doctype html><title>About</title>");
		await writeFile(join(staticRoot, "404.html"), "<!doctype html><title>Page not found</title>");
		const app = createApp({ staticRoot });

		await request(app).get("/").expect(200).expect("Cache-Control", /must-revalidate/);
		await request(app).get("/about").expect(200).expect(/About/);
		await request(app).get("/about/").expect(308).expect("Location", "/about");
		await request(app).head("/about.html?source=test").expect(308).expect("Location", "/about?source=test");
		await request(app).get("/index.html").expect(308).expect("Location", "/");
		await request(app).get("/client-route").set("Accept", "text/html").expect(404).expect(/Page not found/);
		const missingHead = await request(app).head("/client-route").set("Accept", "text/html").expect(404);
		expect(missingHead.text).toBeUndefined();
		await request(app).get("/404").expect(404).expect(/Page not found/);
		await request(app).get("/404.html").expect(404).expect(/Page not found/);
		await request(app).get("/client-route").set("Accept", "application/json").expect(404, { ok: false, error: "not-found" });
		await request(app).get("/api").set("Accept", "text/html").expect(404, { ok: false, error: "not-found" }).expect("Cache-Control", "no-store");
		await request(app).get("/missing.js").expect(404);
		await request(app).get("/api/missing").set("Accept", "text/html").expect(404);
		await request(app).get("/accounts/me").set("Accept", "text/html").expect(404);
		await request(app).get("/_dbinfo").set("Accept", "text/html").expect(404);
	});

	it("snapshots canonical pages and the 404 response instead of touching the filesystem per request", async () => {
		const staticRoot = await mkdtemp(join(tmpdir(), "restoration-static-snapshot-"));
		temporaryDirectories.push(staticRoot);
		await writeFile(join(staticRoot, "index.html"), "<!doctype html><title>Restoration</title>");
		await writeFile(join(staticRoot, "about.html"), "<!doctype html><title>About</title>");
		await writeFile(join(staticRoot, "404.html"), "<!doctype html><title>Snapshot not found</title>");
		const app = createApp({ staticRoot });

		await unlink(join(staticRoot, "about.html"));
		await unlink(join(staticRoot, "404.html"));
		await request(app).get("/about.html?source=snapshot").expect(308).expect("Location", "/about?source=snapshot");
		await request(app).get("/missing").set("Accept", "text/html").expect(404).expect(/Snapshot not found/);
	});
});
