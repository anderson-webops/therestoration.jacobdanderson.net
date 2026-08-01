import type { Request } from "express";
import type { SendMailOptions } from "nodemailer";
import { Buffer } from "node:buffer";
import process from "node:process";
import nodemailer from "nodemailer";
import { z } from "zod";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);
const SUPPORTED_CONTACT_VARIABLES = new Set([
	"CONTACT_BCC_EMAIL",
	"CONTACT_FROM_EMAIL",
	"CONTACT_FROM_NAME",
	"CONTACT_SENDMAIL_PATH",
	"CONTACT_SMTP_HOST",
	"CONTACT_SMTP_PASS",
	"CONTACT_SMTP_PORT",
	"CONTACT_SMTP_REQUIRE_TLS",
	"CONTACT_SMTP_SECURE",
	"CONTACT_SMTP_USER",
	"CONTACT_TO_EMAIL",
	"CONTACT_USE_SENDMAIL"
]);
const emailAddressSchema = z.string().trim().email().max(320);

function hasHeaderControlCharacter(value: string) {
	return [...value].some((character) => {
		const codePoint = character.codePointAt(0) ?? 0;
		return codePoint < 32 || codePoint === 127;
	});
}

function hasMessageControlCharacter(value: string) {
	return [...value].some((character) => {
		const codePoint = character.codePointAt(0) ?? 0;
		return (codePoint < 32 && codePoint !== 9 && codePoint !== 10) || codePoint === 127;
	});
}

export const contactFormSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1)
			.max(120)
			.refine(value => !hasHeaderControlCharacter(value), "Name contains invalid characters."),
		email: emailAddressSchema,
		message: z
			.string()
			.trim()
			.min(10)
			.max(5000)
			.refine(value => !hasMessageControlCharacter(value), "Message contains invalid characters."),
		website: z.string().trim().max(200).optional().default("")
	})
	.strict();

export type ContactFormPayload = z.infer<typeof contactFormSchema>;
export type ContactRequestContext = Pick<Request, "ip" | "headers">;
export type ContactSender = (payload: ContactFormPayload, requestContext: ContactRequestContext) => Promise<void>;

export interface ContactMailIdentity {
	fromEmail: string;
	fromName: string;
	toEmail: string;
	bccEmail?: string[];
}

function trimToUndefined(value?: string) {
	const trimmed = value?.trim();
	return trimmed || undefined;
}

function parseBoolean(name: string, value?: string) {
	const normalized = trimToUndefined(value)?.toLowerCase();
	if (!normalized) return false;
	if (TRUE_VALUES.has(normalized)) return true;
	if (FALSE_VALUES.has(normalized)) return false;
	throw new TypeError(`${name} must be a boolean value.`);
}

function parseEmail(name: string, value?: string) {
	const result = emailAddressSchema.safeParse(value);
	if (!result.success) throw new TypeError(`${name} must be a valid email address.`);
	return result.data;
}

function parseAddressList(value?: string) {
	const entries = value
		?.split(",")
		.map(part => part.trim())
		.filter(Boolean);

	return entries?.map((entry, index) => parseEmail(`CONTACT_BCC_EMAIL entry ${index + 1}`, entry));
}

function parsePort(value: string) {
	const port = Number(value);
	if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
		throw new TypeError("CONTACT_SMTP_PORT must be an integer between 1 and 65535.");
	}
	return port;
}

function parseSmtpHost(value?: string) {
	const host = trimToUndefined(value);
	if (!host || host.length > 253 || /[\s/\\@]/.test(host) || hasHeaderControlCharacter(host)) {
		throw new TypeError("CONTACT_SMTP_HOST must be a valid SMTP host name or address.");
	}
	return host;
}

function safeHeaderValue(value?: string) {
	return value?.replaceAll("\r", " ").replaceAll("\n", " ").replaceAll("\t", " ").trim();
}

function escapeHtml(value?: string) {
	return (value || "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\"", "&quot;")
		.replaceAll("'", "&#39;");
}

function firstHeaderValue(value: string | string[] | undefined) {
	return safeHeaderValue(Array.isArray(value) ? value[0] : value);
}

export function buildContactMessage(
	identity: ContactMailIdentity,
	payload: ContactFormPayload,
	requestContext: ContactRequestContext
): SendMailOptions {
	const submittedAt = new Date().toISOString();
	const clientIp = safeHeaderValue(requestContext.ip);
	const userAgent = firstHeaderValue(requestContext.headers["user-agent"]);
	const referer = firstHeaderValue(requestContext.headers.referer);
	const metadata = [
		`Submitted: ${submittedAt}`,
		`From name: ${safeHeaderValue(payload.name)}`,
		`From email: ${safeHeaderValue(payload.email)}`,
		`Reply-To: ${safeHeaderValue(payload.email)}`,
		clientIp ? `IP: ${clientIp}` : undefined,
		userAgent ? `User-Agent: ${userAgent}` : undefined,
		referer ? `Referer: ${referer}` : undefined
	]
		.filter(Boolean)
		.join("\n");
	const escapedMessage = escapeHtml(payload.message).replaceAll("\n", "<br />");

	return {
		from: `"${safeHeaderValue(identity.fromName)}" <${identity.fromEmail}>`,
		to: identity.toEmail,
		...(identity.bccEmail?.length ? { bcc: identity.bccEmail } : {}),
		replyTo: payload.email,
		subject: `[therestoration.jacobdanderson.net] Contact form from ${safeHeaderValue(payload.name)}`,
		text: `${metadata}\n\nMessage:\n${payload.message}`,
		html: `
			<p>A new contact form submission was received from <strong>${escapeHtml(payload.name)}</strong>.</p>
			<p><strong>Email:</strong> ${escapeHtml(payload.email)}</p>
			<p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
			${clientIp ? `<p><strong>IP:</strong> ${escapeHtml(clientIp)}</p>` : ""}
			${userAgent ? `<p><strong>User-Agent:</strong> ${escapeHtml(userAgent)}</p>` : ""}
			${referer ? `<p><strong>Referer:</strong> ${escapeHtml(referer)}</p>` : ""}
			<hr />
			<p>${escapedMessage}</p>
		`
	};
}

export function createContactSender(environment: NodeJS.ProcessEnv = process.env): ContactSender | null {
	for (const [name, value] of Object.entries(environment)) {
		if (name.startsWith("CONTACT_") && trimToUndefined(value) && !SUPPORTED_CONTACT_VARIABLES.has(name)) {
			throw new TypeError(`${name} is not a supported contact-mail setting.`);
		}
	}

	const useSendmail = parseBoolean("CONTACT_USE_SENDMAIL", environment.CONTACT_USE_SENDMAIL);
	if (useSendmail || trimToUndefined(environment.CONTACT_SENDMAIL_PATH)) {
		throw new TypeError("Sendmail transport is not supported; configure a TLS-protected SMTP service.");
	}

	const mailConfigurationValues = [
		environment.CONTACT_FROM_EMAIL,
		environment.CONTACT_TO_EMAIL,
		environment.CONTACT_BCC_EMAIL,
		environment.CONTACT_FROM_NAME,
		environment.CONTACT_SMTP_HOST,
		environment.CONTACT_SMTP_PORT,
		environment.CONTACT_SMTP_SECURE,
		environment.CONTACT_SMTP_USER,
		environment.CONTACT_SMTP_PASS,
		environment.CONTACT_SMTP_REQUIRE_TLS
	];
	if (!mailConfigurationValues.some(trimToUndefined)) return null;

	const fromEmail = parseEmail("CONTACT_FROM_EMAIL", environment.CONTACT_FROM_EMAIL);
	const toEmail = environment.CONTACT_TO_EMAIL
		? parseEmail("CONTACT_TO_EMAIL", environment.CONTACT_TO_EMAIL)
		: "contacts@jacobdanderson.net";
	const bccEmail = parseAddressList(environment.CONTACT_BCC_EMAIL);
	const configuredFromName = trimToUndefined(environment.CONTACT_FROM_NAME);
	if (configuredFromName && (configuredFromName.length > 120 || hasHeaderControlCharacter(configuredFromName))) {
		throw new TypeError("CONTACT_FROM_NAME must be a single line of at most 120 characters.");
	}
	const fromName = configuredFromName || "The Restoration";

	const host = parseSmtpHost(environment.CONTACT_SMTP_HOST);
	const secure = parseBoolean("CONTACT_SMTP_SECURE", environment.CONTACT_SMTP_SECURE);
	const requireTls
		= environment.CONTACT_SMTP_REQUIRE_TLS === undefined
			? true
			: parseBoolean("CONTACT_SMTP_REQUIRE_TLS", environment.CONTACT_SMTP_REQUIRE_TLS);
	if (!requireTls) {
		throw new TypeError("CONTACT_SMTP_REQUIRE_TLS cannot be disabled.");
	}
	const port = parsePort(environment.CONTACT_SMTP_PORT || (secure ? "465" : "587"));
	const user = trimToUndefined(environment.CONTACT_SMTP_USER);
	const pass = trimToUndefined(environment.CONTACT_SMTP_PASS);
	if (!!user !== !!pass) {
		throw new TypeError("CONTACT_SMTP_USER and CONTACT_SMTP_PASS must be configured together.");
	}
	if (environment.NODE_ENV === "production" && pass && Buffer.byteLength(pass, "utf8") < 12) {
		throw new TypeError("CONTACT_SMTP_PASS must contain at least 12 UTF-8 bytes in production.");
	}

	const identity = { fromEmail, fromName, toEmail, bccEmail };
	const transport = nodemailer.createTransport({
		host,
		port,
		secure,
		requireTLS: true,
		...(user && pass ? { auth: { user, pass } } : {}),
		connectionTimeout: 10_000,
		greetingTimeout: 10_000,
		socketTimeout: 15_000
	});

	return async (payload, requestContext) => {
		await transport.sendMail(buildContactMessage(identity, payload, requestContext));
	};
}
