import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createCriticalCssRenderer } from "../scripts/critical-css.mts";

let directory: string;
const stylesheet = ".history{color:red}.contact{color:blue}.dialog{display:grid}";

beforeEach(async () => {
	directory = await mkdtemp(join(tmpdir(), "restoration-css-"));
	await writeFile(join(directory, "styles.css"), stylesheet);
});

afterEach(async () => {
	if (directory) await rm(directory, { recursive: true });
});

function documentFor(className: string) {
	return `<!doctype html><html><head><title>Restoration</title><link rel="stylesheet" href="/styles.css"><style>.interactive{display:grid}</style><script defer src="/app.js"></script></head><body><main class="${className}">History</main></body></html>`;
}

function styles(html: string) {
	return [...new DOMParser().parseFromString(html, "text/html").querySelectorAll("style")]
		.map(style => style.textContent)
		.join("");
}

describe("independent modern critical CSS rendering", () => {
	it("inlines matching styles without pruning dynamic rules or the complete file", async () => {
		const html = await createCriticalCssRenderer(directory)(documentFor("history"));
		expect(styles(html)).toContain(".history{color:red}");
		expect(styles(html)).not.toContain(".contact{");
		expect(styles(html)).toContain(".interactive{display:grid}");
		expect(await readFile(join(directory, "styles.css"), "utf8")).toBe(stylesheet);
	});

	it("loads full styles without executable inline code or event handlers", async () => {
		const html = await createCriticalCssRenderer(directory)(documentFor("contact"));
		const document = new DOMParser().parseFromString(html, "text/html");
		expect(document.body.querySelector("link[rel=\"stylesheet\"]")?.getAttribute("href")).toBe("/styles.css");
		expect([...document.querySelectorAll("script")].every(script => Boolean(script.src))).toBe(true);
		expect(
			[...document.querySelectorAll("*")].some(element =>
				[...element.attributes].some(attribute => /^on/i.test(attribute.name))
			)
		).toBe(false);
	});

	it("isolates parallel routes", async () => {
		const render = createCriticalCssRenderer(directory);
		const [history, contact] = await Promise.all([render(documentFor("history")), render(documentFor("contact"))]);
		expect(styles(history)).toContain(".history{color:red}");
		expect(styles(history)).not.toContain(".contact{");
		expect(styles(contact)).toContain(".contact{color:blue}");
		expect(styles(contact)).not.toContain(".history{");
	});

	it("fails every missing-stylesheet attempt, even after the same warning", async () => {
		const render = createCriticalCssRenderer(directory);
		const html = documentFor("history").replace("/styles.css", "/missing.css");
		for (const attempt of [1, 2]) {
			await expect(render(html), `missing stylesheet attempt ${attempt}`).rejects.toThrow(
				"Critical CSS generation failed"
			);
		}
	});
});
