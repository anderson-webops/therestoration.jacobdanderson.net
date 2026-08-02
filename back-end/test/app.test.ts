import { mkdtemp, rm, writeFile } from "node:fs/promises";
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
	release: "v4.0.0",
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

		const health = await request(app).get("/healthz").expect(200, { ok: true, deployment });
		expect(health.headers["cache-control"]).toBe("no-store");
		expect(health.headers["content-security-policy"]).toContain(
			"https://analytics.jacobdanderson.net"
		);
		expect(health.headers["x-content-type-options"]).toBe("nosniff");
		expect(health.headers["x-frame-options"]).toBe("DENY");
		expect(health.headers["x-powered-by"]).toBeUndefined();
		expect(health.headers["set-cookie"]).toBeUndefined();
		expect(health.headers["access-control-allow-origin"]).toBeUndefined();

		await request(app).get("/readyz").expect(200, {
			ready: true,
			components: { contactMail: { ok: true } },
			deployment
		});
		await request(createApp()).get("/readyz").expect(503, {
			ready: false,
			components: { contactMail: { ok: false } },
			deployment: {
				release: "development",
				commitSha: "development",
				deployedAt: null
			}
		});
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

	it("serves static pages while keeping API misses out of the SPA fallback", async () => {
		const staticRoot = await mkdtemp(join(tmpdir(), "restoration-static-"));
		temporaryDirectories.push(staticRoot);
		await writeFile(join(staticRoot, "index.html"), "<!doctype html><title>Restoration</title>");
		await writeFile(join(staticRoot, "about.html"), "<!doctype html><title>About</title>");
		const app = createApp({ staticRoot });

		await request(app).get("/").expect(200).expect("Cache-Control", /must-revalidate/);
		await request(app).get("/about").expect(200).expect(/About/);
		await request(app).get("/client-route").set("Accept", "text/html").expect(200);
		await request(app).get("/missing.js").expect(404);
		await request(app).get("/api/missing").set("Accept", "text/html").expect(404);
		await request(app).get("/accounts/me").set("Accept", "text/html").expect(404);
		await request(app).get("/_dbinfo").set("Accept", "text/html").expect(404);
	});
});
