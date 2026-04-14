import type { Request } from "express";
import { env } from "node:process";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { z } from "zod";

const truthyValues = new Set(["1", "true", "yes", "on"]);

function isEnabled(value?: string) {
	return truthyValues.has(value?.trim().toLowerCase() || "");
}

function trimToUndefined(value?: string) {
	const trimmed = value?.trim();
	return trimmed || undefined;
}

function parseAddressList(value?: string) {
	return value
		?.split(",")
		.map(part => part.trim())
		.filter(Boolean);
}

export const contactFormSchema = z.object({
	name: z.string().trim().min(1).max(120),
	email: z.string().trim().email().max(320),
	message: z.string().trim().min(10).max(5000),
	website: z.string().trim().max(0).optional().or(z.literal(""))
});

export type ContactFormPayload = z.infer<typeof contactFormSchema>;

export const contactRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 5,
	standardHeaders: true,
	legacyHeaders: false
});

function getContactMailConfig() {
	const fromEmail = trimToUndefined(env.CONTACT_FROM_EMAIL);
	if (!fromEmail) {
		return null;
	}

	const toEmail = trimToUndefined(env.CONTACT_TO_EMAIL) || "contacts@jacobdanderson.net";
	const bccEmail = parseAddressList(env.CONTACT_BCC_EMAIL);
	const fromName = trimToUndefined(env.CONTACT_FROM_NAME) || "The Restoration";
	const sendmailPath = trimToUndefined(env.CONTACT_SENDMAIL_PATH);
	const useSendmail = isEnabled(env.CONTACT_USE_SENDMAIL) || !!sendmailPath;

	if (useSendmail) {
		return {
			fromEmail,
			fromName,
			toEmail,
			bccEmail,
			transport: nodemailer.createTransport({
				sendmail: true,
				newline: "unix",
				...(sendmailPath ? { path: sendmailPath } : {})
			})
		};
	}

	const host = trimToUndefined(env.CONTACT_SMTP_HOST);
	if (!host) {
		return null;
	}

	const secure = isEnabled(env.CONTACT_SMTP_SECURE);
	const port = Number.parseInt(env.CONTACT_SMTP_PORT || (secure ? "465" : "587"), 10);
	if (!Number.isFinite(port)) {
		throw new TypeError("Invalid CONTACT_SMTP_PORT");
	}

	const user = trimToUndefined(env.CONTACT_SMTP_USER);
	const pass = trimToUndefined(env.CONTACT_SMTP_PASS);

	return {
		fromEmail,
		fromName,
		toEmail,
		bccEmail,
		transport: nodemailer.createTransport({
			host,
			port,
			secure,
			requireTLS: isEnabled(env.CONTACT_SMTP_REQUIRE_TLS),
			...(user && pass ? { auth: { user, pass } } : {})
		})
	};
}

export function isContactMailConfigured() {
	try {
		return !!getContactMailConfig();
	}
	catch {
		return false;
	}
}

function formatHeaderLine(label: string, value?: string) {
	return value ? `${label}: ${value}` : undefined;
}

export async function sendContactMessage(
	payload: ContactFormPayload,
	requestContext: Pick<Request, "ip" | "headers">
) {
	const mailConfig = getContactMailConfig();
	if (!mailConfig) {
		throw new Error("Contact mail is not configured");
	}

	const submittedAt = new Date().toISOString();
	const userAgent = trimToUndefined(requestContext.headers["user-agent"]);
	const referer = trimToUndefined(
		typeof requestContext.headers.referer === "string"
			? requestContext.headers.referer
			: Array.isArray(requestContext.headers.referer)
				? requestContext.headers.referer[0]
				: undefined
	);

	const metadata = [
		formatHeaderLine("Submitted", submittedAt),
		formatHeaderLine("From name", payload.name),
		formatHeaderLine("From email", payload.email),
		formatHeaderLine("Reply-To", payload.email),
		formatHeaderLine("IP", requestContext.ip),
		formatHeaderLine("User-Agent", userAgent),
		formatHeaderLine("Referer", referer)
	]
		.filter(Boolean)
		.join("\n");

	const escapedMessage = payload.message
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\n", "<br />");

	await mailConfig.transport.sendMail({
		from: `"${mailConfig.fromName}" <${mailConfig.fromEmail}>`,
		to: mailConfig.toEmail,
		...(mailConfig.bccEmail?.length ? { bcc: mailConfig.bccEmail } : {}),
		replyTo: payload.email,
		subject: `[therestoration.jacobdanderson.net] Contact form from ${payload.name}`,
		text: `${metadata}\n\nMessage:\n${payload.message}`,
		html: `
			<p>A new contact form submission was received from <strong>${payload.name}</strong>.</p>
			<p><strong>Email:</strong> ${payload.email}</p>
			<p><strong>Submitted:</strong> ${submittedAt}</p>
			${requestContext.ip ? `<p><strong>IP:</strong> ${requestContext.ip}</p>` : ""}
			${userAgent ? `<p><strong>User-Agent:</strong> ${userAgent}</p>` : ""}
			${referer ? `<p><strong>Referer:</strong> ${referer}</p>` : ""}
			<hr />
			<p>${escapedMessage}</p>
		`
	});
}
