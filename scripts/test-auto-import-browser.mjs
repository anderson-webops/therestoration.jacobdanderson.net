import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { buildImportFixture, projectRoot } from "./auto-import-fixture.mjs";

export async function exerciseImportFixture(prefix = projectRoot) {
	const require = createRequire(path.join(prefix, "package.json"));
	const { preview } = await import(pathToFileURL(require.resolve("vite")));
	const { default: puppeteer } = await import(pathToFileURL(require.resolve("puppeteer-core")));
	const executablePath = [process.env.PUPPETEER_EXECUTABLE_PATH, "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium"].find(candidate => candidate && existsSync(candidate));
	assert.ok(executablePath, "A real configured browser is required");
	const built = await buildImportFixture(prefix);
	let server;
	let browser;
	try {
		server = await preview({ root: built.directory, configFile: false, logLevel: "silent", preview: { host: "127.0.0.1", port: 0, strictPort: true } });
		const address = `http://127.0.0.1:${server.httpServer.address().port}`;
		browser = await puppeteer.launch({ executablePath, userDataDir: path.join(built.directory, "browser-profile"), headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
		const page = await browser.newPage();
		const failures = [];
		page.on("pageerror", error => failures.push(error.message));
		page.on("response", (response) => {
			if (response.url().startsWith(address) && response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
		});
		await page.setRequestInterception(true);
		page.on("request", request => request.url().startsWith(`${address}/`) ? request.continue() : request.abort());
		await page.goto(address, { waitUntil: "networkidle0", timeout: 30000 });
		await page.waitForFunction(() => document.querySelector("#count")?.textContent === "41");
		await page.click("#count");
		await page.waitForFunction(() => document.querySelector("#count")?.textContent === "42");
		await page.click("#lazy");
		await page.waitForFunction(() => document.querySelector("#status")?.textContent === "ready");
		assert.equal(await page.$eval("#status", element => getComputedStyle(element).color), "rgb(1, 2, 3)");
		await page.reload({ waitUntil: "networkidle0" });
		await page.waitForFunction(() => document.querySelector("#count")?.textContent === "41");
		assert.deepEqual(failures, []);
		console.log("Actual Vite auto-import hydration, reactivity, local scanning, lazy CSS and reload passed.");
	}
	finally {
		await browser?.close();
		if (server) {
			await new Promise((resolveClose, reject) => {
				server.httpServer.close(error => error ? reject(error) : resolveClose());
				server.httpServer.closeAllConnections();
			});
		}
		await built.dispose();
	}
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) await exerciseImportFixture();
