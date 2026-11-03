import type { App } from "vue";
import { createHead as createClientHead } from "@unhead/vue/client";
import { createHead as createServerHead, transformHtmlTemplate } from "@unhead/vue/server";

export function createServerSsgHeadBridge() {
	const head = createServerHead();
	return {
		head,
		renderDocumentHead: (html: string) => transformHtmlTemplate(head, html)
	};
}

export function createClientSsgHeadBridge() {
	return {
		head: createClientHead(),
		renderDocumentHead: (_html: string): string => {
			throw new Error("Document head serialization requires a server context");
		}
	};
}

export function installSsgHeadBridge<Context extends { app: App; head?: unknown }>(
	context: Context,
	bridge = import.meta.env.SSR ? createServerSsgHeadBridge() : createClientSsgHeadBridge()
) {
	if (context.head !== undefined) {
		throw new Error("Disable the legacy SSG head before installing Unhead 3");
	}
	context.app.use(bridge.head);
	return Object.assign(context, { head: undefined, renderDocumentHead: bridge.renderDocumentHead });
}

export function renderSsgDocumentHead(html: string, context: unknown): string {
	if (
		context === null ||
		typeof context !== "object" ||
		!("renderDocumentHead" in context) ||
		typeof context.renderDocumentHead !== "function"
	) {
		throw new Error("Missing SSG document head renderer");
	}
	const rendered: unknown = context.renderDocumentHead(html);
	if (typeof rendered !== "string") {
		throw new TypeError("SSG document head renderer must return HTML");
	}
	return rendered;
}
