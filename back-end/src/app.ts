import type { ErrorRequestHandler } from "express";
import type { ContactSender } from "./contact.js";
import type { DeploymentIdentity } from "./deployment.js";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import express from "express";
import rateLimit from "express-rate-limit";

import helmet from "helmet";
import { contactFormSchema } from "./contact.js";

export interface AppOptions {
	contactSender?: ContactSender | null;
	staticRoot?: string;
	trustProxyHops?: number;
	contactRateLimit?: number;
	deployment?: DeploymentIdentity;
	publicOrigin?: string;
}

const RESERVED_SERVER_PATHS = ["/accounts", "/admin", "/auth", "/login", "/session", "/users"];

function isReservedServerPath(path: string) {
	return path === "/api" || path.startsWith("/api/")
		|| path.startsWith("/_")
		|| RESERVED_SERVER_PATHS.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

function safeErrorCode(error: unknown) {
	if (!error || typeof error !== "object" || !("code" in error)) return undefined;
	const code = String(error.code);
	return /^[\w.-]{1,64}$/.test(code) ? code : undefined;
}

const FALLBACK_NOT_FOUND_HTML = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>Page not found | The Restoration</title></head><body><main><h1>Page not found</h1><p>The page may have moved or the address may be incorrect.</p><a href=\"/\">Return home</a></main></body></html>";

function loadStaticSurface(staticRoot: string) {
	const pages = new Set(
		readdirSync(staticRoot, { withFileTypes: true })
			.filter(entry => entry.isFile() && entry.name.endsWith(".html"))
			.map(entry => entry.name.slice(0, -".html".length))
	);
	let notFoundHtml = FALLBACK_NOT_FOUND_HTML;
	try {
		notFoundHtml = readFileSync(resolve(staticRoot, "404.html"), "utf8");
	}
	catch (error) {
		if (safeErrorCode(error) !== "ENOENT") throw error;
	}
	return { notFoundHtml, pages };
}

function securityMiddleware() {
	return helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				baseUri: ["'self'"],
				connectSrc: ["'self'", "https://analytics.jacobdanderson.net"],
				fontSrc: ["'self'", "data:"],
				formAction: ["'self'"],
				frameAncestors: ["'none'"],
				frameSrc: ["'none'"],
				imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org"],
				manifestSrc: ["'self'"],
				objectSrc: ["'none'"],
				scriptSrc: ["'self'", "'unsafe-inline'", "https://analytics.jacobdanderson.net"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				upgradeInsecureRequests: []
			}
		},
		crossOriginEmbedderPolicy: false,
		crossOriginOpenerPolicy: { policy: "same-origin" },
		crossOriginResourcePolicy: { policy: "same-origin" },
		frameguard: { action: "deny" },
		referrerPolicy: { policy: "strict-origin-when-cross-origin" }
	});
}

function sameOriginWriteMiddleware(publicOrigin?: string) {
	return (req: express.Request, res: express.Response, next: express.NextFunction) => {
		const requestOrigin = req.get("origin");
		const fetchSite = req.get("sec-fetch-site")?.toLowerCase();
		const expectedOrigin = publicOrigin || `${req.protocol}://${req.get("host")}`;

		if (fetchSite === "cross-site" || (requestOrigin && requestOrigin !== expectedOrigin)) {
			res.status(403).json({ ok: false, error: "cross-site-request-denied" });
			return;
		}
		next();
	};
}

export function createApp(options: AppOptions = {}) {
	const app = express();
	const contactSender = options.contactSender ?? null;
	const staticRoot = options.staticRoot ? resolve(options.staticRoot) : undefined;
	const staticSurface = staticRoot ? loadStaticSurface(staticRoot) : undefined;
	const deployment = options.deployment ?? {
		release: "development",
		commitSha: "development",
		deployedAt: null
	};

	app.disable("x-powered-by");
	app.set("trust proxy", options.trustProxyHops || false);
	app.use(securityMiddleware());

	app.use((req, res, next) => {
		if (
			req.path === "/api" || req.path.startsWith("/api/")
			|| req.path === "/healthz"
			|| req.path === "/readyz"
			|| req.path === "/release.json"
		) {
			res.set("Cache-Control", "no-store");
		}
		next();
	});

	const sendProbe = (req: express.Request, res: express.Response, ok: boolean) => {
		const response = res.status(ok ? 200 : 503);
		return req.method === "HEAD" ? response.end() : response.json({ ok });
	};
	const healthHandler: express.RequestHandler = (req, res) => sendProbe(req, res, true);
	const readinessHandler: express.RequestHandler = (req, res) => sendProbe(req, res, Boolean(contactSender));

	app.head("/healthz", healthHandler);
	app.get("/healthz", healthHandler);
	app.head("/readyz", readinessHandler);
	app.get("/readyz", readinessHandler);

	app.get("/release.json", (_req, res) => {
		res.json(deployment);
	});

	app.post(
		"/api/contact",
		sameOriginWriteMiddleware(options.publicOrigin),
		rateLimit({
			windowMs: 15 * 60 * 1000,
			limit: options.contactRateLimit ?? 5,
			standardHeaders: true,
			legacyHeaders: false,
			handler: (_req, res) => {
				res.status(429).json({
					ok: false,
					error: "Too many messages were submitted. Please try again later."
				});
			}
		}),
		(req, res, next) => {
			if (!req.is("application/json")) {
				res.status(415).json({ ok: false, error: "content-type-must-be-application-json" });
				return;
			}
			next();
		},
		express.json({ limit: "16kb", strict: true }),
		async (req, res) => {
			const parsedBody = contactFormSchema.safeParse(req.body);
			if (!parsedBody.success) {
				return res.status(400).json({
					ok: false,
					error: "Please provide a valid name, email address, and message."
				});
			}

			if (parsedBody.data.website) return res.status(202).json({ ok: true });
			if (!contactSender) {
				return res.status(503).json({
					ok: false,
					error: "The contact form is not configured on the server yet."
				});
			}

			try {
				await contactSender(parsedBody.data, req);
				return res.status(202).json({ ok: true });
			}
			catch (error) {
				console.error("Contact form delivery failed", {
					name: error instanceof Error ? error.name : "UnknownError",
					code: safeErrorCode(error)
				});
				return res.status(502).json({
					ok: false,
					error: "The message could not be sent right now. Please try again later."
				});
			}
		}
	);

	if (staticRoot) {
		app.use(
			(req, res, next) => {
				const page = /^\/([a-z0-9-]+)(?:\/|\.html)$/.exec(req.path)?.[1];
				if ((req.method === "GET" || req.method === "HEAD") && page && page !== "404" && !isReservedServerPath(`/${page}`)) {
					if (staticSurface!.pages.has(page)) {
						const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
						res.redirect(308, `${page === "index" ? "/" : `/${page}`}${query}`);
						return;
					}
				}
				next();
			},
			(req, res, next) => {
				if (req.path === "/404" || req.path === "/404.html") res.status(404);
				next();
			},
			express.static(staticRoot, {
				extensions: ["html"],
				index: "index.html",
				setHeaders(res, filePath) {
					if (filePath.includes("/assets/")) {
						res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
					}
					else {
						res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
					}
				}
			})
		);

		app.use((req, res, next) => {
			if (
				(req.method !== "GET" && req.method !== "HEAD")
				|| isReservedServerPath(req.path)
				|| extname(req.path)
				|| !req.accepts("html")
			) {
				next();
				return;
			}

			res.set("Cache-Control", "public, max-age=0, must-revalidate");
			res.status(404).type("html").send(staticSurface!.notFoundHtml);
		});
	}

	app.use((_req, res) => {
		res.status(404).json({ ok: false, error: "not-found" });
	});

	const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
		const status = error?.type === "entity.too.large"
			? 413
			: error instanceof SyntaxError
				? 400
				: 500;
		if (status === 500) {
			console.error("Request processing failed", {
				name: error instanceof Error ? error.name : "UnknownError",
				code: safeErrorCode(error)
			});
		}
		res.status(status).json({
			ok: false,
			error: status === 413 ? "request-too-large" : status === 400 ? "invalid-json" : "server-error"
		});
	};
	app.use(errorHandler);

	return app;
}
