import { useHead } from "@unhead/vue";
import { renderToString } from "@vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import { createApp, createSSRApp, h, ref } from "vue";
import {
	createClientSsgHeadBridge,
	createServerSsgHeadBridge,
	installSsgHeadBridge,
	renderSsgDocumentHead
} from "../src/utils/ssgHead";

async function renderRoute(title: string) {
	const app = createSSRApp({
		setup() {
			useHead({
				title,
				htmlAttrs: { lang: "en" },
				meta: [{ name: "description", content: `${title} description` }],
				link: [{ rel: "canonical", href: "https://therestoration.jacobdanderson.net/about" }],
				script: [{ key: "website", type: "application/ld+json", innerHTML: JSON.stringify({ name: title }) }]
			});
			return () => h("main", title);
		}
	});
	const context = installSsgHeadBridge({ app }, createServerSsgHeadBridge());
	const body = await renderToString(app);
	const initialState = "<script id=\"state\" type=\"application/json\">{\"safe\":\"\\u003c\"}</script>";
	const html = `<!doctype html><html><head><meta charset="utf-8"><title>Old title</title><meta name="description" content="Old description"><script src="/app.js"></script></head><body><div id="app">${body}</div>${initialState}</body></html>`;
	return { context, html: renderSsgDocumentHead(html, context), body, initialState };
}

describe("supported Unhead 3 server rendering", () => {
	it("renders metadata once without exposing a head to the legacy renderer", async () => {
		const rendered = await renderRoute("History & places");
		const document = new DOMParser().parseFromString(rendered.html, "text/html");
		expect(rendered.context.head).toBeUndefined();
		expect(document.title).toBe("History & places");
		expect(document.querySelectorAll("title")).toHaveLength(1);
		expect(document.querySelectorAll("meta[name=\"description\"]")).toHaveLength(1);
		expect(document.querySelector("meta[name=\"description\"]")?.getAttribute("content")).toBe(
			"History & places description"
		);
		expect(document.documentElement.lang).toBe("en");
		expect(document.querySelector("link[rel=\"canonical\"]")?.getAttribute("href")).toBe(
			"https://therestoration.jacobdanderson.net/about"
		);
		expect(JSON.parse(document.querySelector("script[type=\"application/ld+json\"]")?.textContent || "{}")).toEqual({
			name: "History & places"
		});
		expect(document.querySelectorAll("script[src=\"/app.js\"]")).toHaveLength(1);
		expect(rendered.html).toContain(`<div id="app">${rendered.body}</div>`);
		expect(rendered.html).toContain(rendered.initialState);
	});

	it("isolates concurrent page metadata", async () => {
		const [first, second] = await Promise.all([renderRoute("First page"), renderRoute("Second page")]);
		expect(first.html).toContain("First page");
		expect(first.html).not.toContain("Second page");
		expect(second.html).toContain("Second page");
		expect(second.html).not.toContain("First page");
	});

	it("rejects an already installed legacy head", () => {
		expect(() => installSsgHeadBridge({ app: createSSRApp({}), head: {} }, createServerSsgHeadBridge())).toThrow(
			"Disable the legacy SSG head"
		);
	});

	it.each([null, undefined, {}, { renderDocumentHead: "not a function" }])("rejects missing renderer %s", (context) => {
		expect(() => renderSsgDocumentHead("<html></html>", context)).toThrow("Missing SSG document head renderer");
	});

	it("rejects a renderer returning non-HTML", () => {
		expect(() => renderSsgDocumentHead("<html></html>", { renderDocumentHead: () => undefined })).toThrow(
			"must return HTML"
		);
	});

	it("does not serialize browser state as a server document", () => {
		expect(() => createClientSsgHeadBridge().renderDocumentHead("<html></html>")).toThrow(
			"requires a server context"
		);
	});

	it("reuses keyed SSR scripts after stylesheet HTML normalization", async () => {
		const component = {
			setup() {
				useHead({
					script: [
						{
							key: "fixture-analytics",
							src: "https://fixture.invalid/analytics.js",
							defer: true
						}
					]
				});
				return () => h("main", "Fixture");
			}
		};
		const serverApp = createSSRApp(component);
		const serverContext = installSsgHeadBridge({ app: serverApp }, createServerSsgHeadBridge());
		const body = await renderToString(serverApp);
		const html = renderSsgDocumentHead(
			`<!doctype html><html><head></head><body>${body}</body></html>`,
			serverContext
		);
		const script = new DOMParser().parseFromString(html, "text/html").querySelector("script");
		if (!script) throw new Error("Missing fixture script");
		script.setAttribute("defer", "defer");
		document.head.append(script);
		const container = document.createElement("div");
		container.innerHTML = body;
		document.body.append(container);
		const clientApp = createSSRApp(component);
		const clientBridge = createClientSsgHeadBridge();
		installSsgHeadBridge({ app: clientApp }, clientBridge);
		const selector = "script[src=\"https://fixture.invalid/analytics.js\"]";
		try {
			clientApp.mount(container);
			await clientBridge.head.render();
			expect(document.querySelectorAll(selector)).toHaveLength(1);
			expect(document.querySelector(selector)).toBe(script);
		}
		finally {
			clientApp.unmount();
			await clientBridge.head.render();
			document.querySelectorAll(selector).forEach(element => element.remove());
			container.remove();
		}
	});

	it("updates and removes reactive browser metadata", async () => {
		const title = ref("Initial page");
		const app = createApp({
			setup() {
				useHead(() => ({ title: title.value, meta: [{ name: "bridge-description", content: title.value }] }));
				return () => h("main", title.value);
			}
		});
		const container = document.createElement("div");
		document.body.append(container);
		installSsgHeadBridge({ app }, createClientSsgHeadBridge());
		try {
			app.mount(container);
			await vi.waitFor(() => expect(document.title).toBe("Initial page"));
			title.value = "Updated page";
			await vi.waitFor(() =>
				expect(document.querySelector("meta[name=\"bridge-description\"]")?.getAttribute("content")).toBe(
					"Updated page"
				)
			);
		}
		finally {
			app.unmount();
			container.remove();
		}
		await vi.waitFor(() => expect(document.querySelector("meta[name=\"bridge-description\"]")).toBeNull());
	});
});
