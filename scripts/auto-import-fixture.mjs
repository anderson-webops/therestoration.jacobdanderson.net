import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

export const projectRoot = path.resolve(import.meta.dirname, "..");

export async function temporaryImportProject(prefix = projectRoot) {
	const parent = path.join(prefix, ".ai-work/runs");
	await mkdir(parent, { recursive: true });
	return mkdtemp(path.join(parent, "auto-import-"));
}

export async function buildImportFixture(prefix = projectRoot) {
	const resolver = createRequire(path.join(prefix, "package.json"));
	const load = name => import(pathToFileURL(resolver.resolve(name)));
	const { build } = await load("vite");
	const { default: vue } = await load("@vitejs/plugin-vue");
	const { default: autoImport } = await load("unplugin-auto-import/vite");
	const directory = await temporaryImportProject(prefix);
	try {
		const files = {
			"package.json": JSON.stringify({ private: true, type: "module" }),
			"index.html": "<!doctype html><html><head><meta charset=\"utf-8\"><link rel=\"icon\" href=\"data:,\"><title>Import fixture</title></head><body><div id=\"app\"></div><script type=\"module\" src=\"/src/main.ts\"></script></body></html>",
			"src/main.ts": "import { createApp } from \"vue\"; import App from \"./App.vue\"; createApp(App).mount(\"#app\");",
			"src/App.vue": "<script setup lang=\"ts\">const count = ref(1); const total = computed(() => useFixtureValue() + count.value); const status = ref(\"\"); async function loadLazy() { const loaded = await import(\"./lazy.ts\"); status.value = loaded.lazyValue; }</script><template><button id=\"count\" @click=\"count++\">{{ total }}</button><button id=\"lazy\" @click=\"loadLazy\">Load</button><span id=\"status\" class=\"lazy-indicator\">{{ status }}</span></template>",
			"src/composables/useFixtureValue.ts": "export const useFixtureValue = () => 40;",
			"src/lazy.ts": "import \"./lazy.css\"; export const lazyValue = \"ready\";",
			"src/lazy.css": ".lazy-indicator { color: rgb(1, 2, 3); }"
		};
		for (const [name, contents] of Object.entries(files)) {
			const filename = path.join(directory, name);
			await mkdir(path.dirname(filename), { recursive: true });
			await writeFile(filename, contents);
		}
		await build({
			root: directory,
			configFile: false,
			logLevel: "silent",
			plugins: [
				vue(),
				autoImport({
					imports: [{ vue: ["ref", "computed"] }],
					dirs: [path.join(directory, "src/composables")],
					dts: path.join(directory, "auto-imports.d.ts"),
					eslintrc: { enabled: true, filepath: path.join(directory, "auto-imports.json"), globalsPropValue: true },
					vueTemplate: true
				})
			],
			build: { minify: true, sourcemap: true, emptyOutDir: true }
		});
		const declarations = await readFile(path.join(directory, "auto-imports.d.ts"), "utf8");
		assert.match(declarations, /const useFixtureValue:/);
		assert.match(declarations, /const ref:/);
		const globals = JSON.parse(await readFile(path.join(directory, "auto-imports.json"), "utf8"));
		assert.equal(globals.globals.useFixtureValue, true);
		const assets = await readdir(path.join(directory, "dist/assets"));
		assert.ok(assets.some(name => name.startsWith("lazy-") && name.endsWith(".js")));
		assert.ok(assets.some(name => name.endsWith(".css")));
		for (const name of assets.filter(name => name.endsWith(".js"))) {
			const parsed = spawnSync(process.execPath, ["--check", path.join(directory, "dist/assets", name)], { encoding: "utf8", timeout: 30000 });
			assert.equal(parsed.status, 0, parsed.stderr);
		}
		return { directory, dispose: () => rm(directory, { recursive: true, force: true }) };
	}
	catch (error) {
		await rm(directory, { recursive: true, force: true });
		throw error;
	}
}
