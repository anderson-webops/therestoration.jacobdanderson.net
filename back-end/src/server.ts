// src/server.ts
import { env, exit } from "node:process";
import bodyParser from "body-parser";
import cookieSession from "cookie-session";
import express from "express";
import mongoose from "mongoose";

import { readMongoSecret } from "./vaultClient.js";
import "dotenv/config";

async function main() {
	const app = express();

	// health
	app.get("/healthz", (_req, res) => res.json({ ok: true }));

	const SESSION_SECRET = env.SESSION_SECRET;
	if (!SESSION_SECRET) throw new Error("Missing SESSION_SECRET");

	app.set("trust proxy", 1);

	// 1) parsers first (with limits)
	app.use(bodyParser.urlencoded({ extended: false, limit: "256kb" }));
	app.use(bodyParser.json({ limit: "256kb" }));

	// 2) sessions BEFORE any route that needs req.session
	///   COOKIES   ///
	const isProd = env.NODE_ENV === "production";
	const isCrossSite = !!env.CROSS_SITE;
	type CookieSessionOpts = Parameters<typeof cookieSession>[0];

	const cookieOptions: CookieSessionOpts = {
		name: "session",
		keys: [SESSION_SECRET],
		maxAge: 24 * 60 * 60 * 1000,
		sameSite: "lax", // default, safe for dev & same-origin
		// Use secure cookies unless in development/local mode.
		// It is strongly recommended to run development with HTTPS and secure cookies as well.
		secure: env.NODE_ENV !== "development",
	};

	// Adjust for production
	if (isProd) {
		if (isCrossSite) {
			cookieOptions.sameSite = "none"; // required for cross-site
			cookieOptions.secure = true; // required when SameSite=None
			// cookieOptions.domain = ".example.com"; // optional if you want subdomain sharing
		}
		else {
			cookieOptions.sameSite = "lax"; // fine for same-origin
			cookieOptions.secure = true; // enforce HTTPS cookies
		}
	}

	app.use(cookieSession(cookieOptions));

	// 3) cache-control for auth endpoints
	app.use((req, res, next) => {
		if (req.path.startsWith("/accounts") || req.path.endsWith("/loggedin")) {
			res.setHeader("Cache-Control", "no-store");
		}
		next();
	});

	// ready
	app.get("/readyz", (_req, res) => {
		const s = mongoose.connection.readyState; // 1=connected, 2=connecting
		if (s === 1) return res.json({ ready: true });
		return res.status(503).json({ ready: false, state: s });
	});

	// cache-control for auth endpoints
	app.use((req, res, next) => {
		if (req.path.startsWith("/accounts") || req.path.endsWith("/loggedin")) {
			res.setHeader("Cache-Control", "no-store");
		}
		next();
	});

	// --- Get Mongo URI from Vault (preferred), else env fallback ---
	let mongoUri: string | undefined;
	try {
		const { uri } = await readMongoSecret(); // your Vault client should read from KV v2
		mongoUri = uri;
	}
	catch (e) {
		// Fail silently if Vault is not available, then probably local test (Had to do this to avoid weird requirements
		// console.log("Vault unavailable, falling back to MONGODB_URI:", e);
		const m: string = e?.toString() || "";
		if (!m.includes("Failed to fetch") && !m.includes("connect ECONNREFUSED")) {
			console.log("");
		}

		mongoUri = env.MONGODB_URI;
	}

	if (!mongoUri) {
		throw new Error("No MongoDB URI available (Vault and MONGODB_URI missing)");
	}

	await mongoose.connect(mongoUri);
	console.log("Connected to MongoDB");
	const c = mongoose.connection;
	console.log(`Mongo connected: db=${c.db?.databaseName} host=${c.host} name=${c.name}`);
	app.get("/_dbinfo", (_req, res) => {
		res.json({
			databaseName: c.db?.databaseName,
			host: c.host,
			name: c.name,
			usingVault: !!env.VAULT_ROLE_ID && !!env.VAULT_SECRET_ID,
		});
	});

	// after your session middleware in server.ts
	app.get("/accounts/me", (req, res) => {
		const s = req.session as any;
		res.json({ adminID: s?.adminID ?? null, tutorID: s?.tutorID ?? null, userID: s?.userID ?? null });
	});

	const PORT = env.PORT || 3007;
	app.listen(PORT, () => console.log(`Server listening on port ${PORT}!`));
}

main().catch((err) => {
	console.error(err);
	exit(1);
});
