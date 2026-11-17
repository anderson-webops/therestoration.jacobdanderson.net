import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { ESLint } from "eslint";
import formatPlugin from "eslint-plugin-format";
import MagicString from "magic-string";
import { describe, it } from "vitest";

const require = createRequire(import.meta.url);
const frontend = createRequire(new URL("../front-end/package.json", import.meta.url));
const uno = createRequire(frontend.resolve("unocss"));
const transformerPath = uno.resolve("@unocss/transformer-attributify-jsx");

describe("current formatter and parser consumers", () => {
	it("formats through the existing ESLint worker with the current Oxfmt API", async () => {
		const plugin = createRequire(require.resolve("eslint-plugin-format"));
		assert.equal(plugin.resolve("oxfmt"), require.resolve("oxfmt"));
		assert.equal(require("oxfmt/package.json").version, "0.79.0");
		const eslint = new ESLint({
			overrideConfigFile: true,
			fix: true,
			overrideConfig: [{
				plugins: { format: formatPlugin },
				rules: { "format/oxfmt": ["error", { semi: true }] }
			}]
		});
		const [fixed] = await eslint.lintText("const sample={value:42}", { filePath: "formatter-fixture.js" });
		assert.equal(fixed.errorCount, 0);
		assert.equal(fixed.output, "const sample = { value: 42 };\n");
		const [repeated] = await eslint.lintText(fixed.output, { filePath: "formatter-fixture.js" });
		assert.deepEqual(repeated.messages, []);
		assert.equal(repeated.output, undefined);
	});

	it.each(["fixture.jsx", "fixture.tsx"])("retains the native UnoCSS parser path for %s", async (filename) => {
		const consumer = createRequire(transformerPath);
		assert.equal(consumer.resolve("oxc-parser"), require.resolve("oxc-parser"));
		assert.equal(require("oxc-parser/package.json").version, "0.159.0");
		const { default: transformer } = await import(pathToFileURL(transformerPath).href);
		const code = new MagicString("const view = <div flex hidden data-mode=\"safe\" />;");
		const selected = [];
		await transformer({
			include: [{ pattern: /\.[jt]sx$/u, resolver: "oxc" }],
			blocklist: ["hidden"]
		}).transform(code, filename, {
			uno: {
				config: { presets: [] },
				parseToken: async (token) => {
					selected.push(token);
					return token === "flex" ? [["display", "flex"]] : undefined;
				}
			}
		});
		assert.deepEqual(selected, ["flex"]);
		assert.equal(code.toString(), "const view = <div flex=\"\" hidden data-mode=\"safe\" />;");
	});
});
