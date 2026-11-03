import { execFileSync } from "node:child_process";
import { renderToString } from "katex";
import { describe, expect, it } from "vitest";

describe("current KaTeX compatibility and trust boundary", () => {
	it("renders ordinary mathematical notation", () => {
		const html = renderToString("\\frac{1}{2} + x^2", { throwOnError: true });
		const document = new DOMParser().parseFromString(html, "text/html");
		expect(document.querySelector(".katex")).not.toBeNull();
		expect(document.querySelector("math")).not.toBeNull();
	});

	it.each([
		"\\href{javascript:alert(1)}{label}",
		"\\includegraphics{https://unapproved.invalid/image.png}",
		"\\htmlClass{unapproved}{x}"
	])("rejects untrusted HTML-producing input: %s", (expression) => {
		const html = renderToString(expression, { throwOnError: false, trust: false });
		const document = new DOMParser().parseFromString(html, "text/html");
		expect(document.querySelector("a, img, script, .unapproved")).toBeNull();
	});

	it("keeps default trust disabled with a polluted object prototype", () => {
		const script = `
			import { renderToString } from "katex";
			Object.defineProperty(Object.prototype, "trust", { value: true, configurable: true, writable: true });
			process.stdout.write(renderToString(${JSON.stringify("\\href{https://unapproved.invalid}{label}")}, { throwOnError: false }));
		`;
		const html = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
			encoding: "utf8",
			timeout: 5_000
		});
		const document = new DOMParser().parseFromString(html, "text/html");
		expect(document.querySelector("a")).toBeNull();
	});
});
