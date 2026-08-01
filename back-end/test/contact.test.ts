import { describe, expect, it } from "vitest";

import { buildContactMessage, contactFormSchema, createContactSender } from "../src/contact.js";

describe("contact mail", () => {
	it("escapes every untrusted value in HTML mail", () => {
		const payload = contactFormSchema.parse({
			name: "<b>Alice</b>",
			email: "alice@example.com",
			message: "Hello <img src=x onerror=alert(1)>\nThank you",
			website: ""
		});
		const message = buildContactMessage(
			{
				fromEmail: "sender@example.com",
				fromName: "The Restoration",
				toEmail: "recipient@example.com"
			},
			payload,
			{
				ip: "127.0.0.1",
				headers: {
					"user-agent": "<script>alert(1)</script>",
					"referer": "https://example.com/<svg onload=alert(1)>"
				}
			}
		);
		const html = String(message.html);

		expect(html).toContain("&lt;b&gt;Alice&lt;/b&gt;");
		expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
		expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
		expect(html).not.toContain("<img src=x");
		expect(html).not.toContain("<script>alert(1)</script>");
		expect(message.subject).not.toContain("\n");
	});

	it("accepts a populated honeypot for silent handling", () => {
		const result = contactFormSchema.safeParse({
			name: "Bot",
			email: "bot@example.com",
			message: "Automated spam message",
			website: "https://spam.example"
		});
		expect(result.success).toBe(true);
	});

	it("fails closed on partial or insecure mail configuration", () => {
		expect(createContactSender({})).toBeNull();
		expect(createContactSender({ CONTACT_USE_SENDMAIL: "false" })).toBeNull();
		expect(() => createContactSender({ CONTACT_SMPT_HOST: "typo.example.com" })).toThrow(
			"not a supported contact-mail setting"
		);
		expect(() => createContactSender({ CONTACT_FROM_EMAIL: "sender@example.com" })).toThrow("CONTACT_SMTP_HOST");
		expect(() =>
			createContactSender({
				CONTACT_FROM_EMAIL: "sender@example.com",
				CONTACT_SMTP_HOST: "smtp.example.com",
				CONTACT_SMTP_SECURE: "sometimes"
			})
		).toThrow("CONTACT_SMTP_SECURE");
		expect(() =>
			createContactSender({
				NODE_ENV: "production",
				CONTACT_FROM_EMAIL: "sender@example.com",
				CONTACT_SMTP_HOST: "smtp.example.com",
				CONTACT_SMTP_USER: "sender",
				CONTACT_SMTP_PASS: "short"
			})
		).toThrow("at least 12 UTF-8 bytes");
		expect(() =>
			createContactSender({
				CONTACT_FROM_EMAIL: "sender@example.com",
				CONTACT_SMTP_HOST: "smtp.example.com",
				CONTACT_SMTP_REQUIRE_TLS: "false"
			})
		).toThrow("cannot be disabled");
		expect(() =>
			createContactSender({
				CONTACT_FROM_EMAIL: "sender@example.com",
				CONTACT_FROM_NAME: "Restoration\r\nBcc: attacker@example.com",
				CONTACT_SMTP_HOST: "smtp.example.com"
			})
		).toThrow("single line");
		expect(() =>
			createContactSender({
				CONTACT_USE_SENDMAIL: "true",
				CONTACT_FROM_EMAIL: "sender@example.com"
			})
		).toThrow("Sendmail transport is not supported");
	});

	it("creates one reusable sender for valid TLS SMTP configuration", () => {
		const sender = createContactSender({
			NODE_ENV: "production",
			CONTACT_FROM_EMAIL: "sender@example.com",
			CONTACT_TO_EMAIL: "recipient@example.com",
			CONTACT_SMTP_HOST: "smtp.example.com",
			CONTACT_SMTP_SECURE: "true",
			CONTACT_SMTP_USER: "sender",
			CONTACT_SMTP_PASS: "long-test-password"
		});
		expect(sender).toBeTypeOf("function");
	});
});
