import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { buildImportFixture, projectRoot, temporaryImportProject } from "./auto-import-fixture.mjs";

const require = createRequire(path.join(projectRoot, "package.json"));
const original = createRequire(path.join(projectRoot, "vendor/unplugin-auto-import/upstream/package.json"));
const load = (resolver, name) => import(pathToFileURL(resolver.resolve(name)));
const currentPlugin = (await load(require, "unplugin-auto-import/vite")).default;
const originalPlugin = (await load(original, "unplugin-auto-import/vite")).default;

async function fixture(context) {
	const directory = await temporaryImportProject();
	await writeFile(path.join(directory, "package.json"), JSON.stringify({ private: true, type: "module" }));
	context.after(() => rm(directory, { recursive: true, force: true }));
	return directory;
}

async function transform(factory, code, filename, options = {}) {
	const plugin = factory({ imports: [{ "fixture-api": ["useFixtureValue", "selected"] }], dts: false, viteOptimizeDeps: false, vueTemplate: true, ...options });
	assert.ok(plugin.transformInclude(filename));
	await plugin.buildStart.call({});
	try {
		const hook = typeof plugin.transform === "function" ? plugin.transform : plugin.transform.handler;
		return await hook.call({}, code, filename);
	}
	finally {
		await plugin.buildEnd.call({});
	}
}

test("the real Vite parent binds the qualified compiler and package resolver without application version 6 copies", async () => {
	const parent = createRequire(require.resolve("unplugin-auto-import/vite"));
	assert.equal(parent.resolve("unimport"), require.resolve("unimport"));
	assert.equal(parent.resolve("local-pkg"), require.resolve("local-pkg"));
	assert.equal(JSON.parse(await readFile(require.resolve("unimport/package.json"), "utf8")).version, "7.0.3+webops.2");
	assert.equal(JSON.parse(await readFile(require.resolve("local-pkg/package.json"), "utf8")).version, "2.0.0");
	const stock = createRequire(original.resolve("unplugin-auto-import/vite"));
	assert.equal(JSON.parse(await readFile(stock.resolve("unimport/package.json"), "utf8")).version, "6.5.0");
	const lock = JSON.parse(await readFile(path.join(projectRoot, "package-lock.json"), "utf8"));
	for (const [filename, metadata] of Object.entries(lock.packages)) {
		if (filename.endsWith("node_modules/unimport")) assert.equal(metadata.version, "7.0.3+webops.2", filename);
	}
});

test("actual JavaScript, TypeScript and Vue injection preserves the original parent contract", async (context) => {
	const directory = await fixture(context);
	for (const [name, code] of [
		["value.ts", "export const value = useFixtureValue()"],
		["shadow.ts", "const useFixtureValue = () => 1; export const value = useFixtureValue()"],
		["typed.ts", "export const value: number = useFixtureValue()"],
		["component.vue", "<script setup>const value = useFixtureValue()</script><template>{{ value }}</template>"]
	]) {
		const filename = path.join(directory, name);
		const expected = await transform(originalPlugin, code, filename);
		const actual = await transform(currentPlugin, code, filename);
		assert.equal(actual?.code, expected?.code, name);
	}
	const annotated = "const { selected }: { selected: number } = { selected: 1 }; export { selected }";
	assert.equal((await transform(currentPlugin, annotated, path.join(directory, "annotated.ts")))?.code ?? annotated, annotated);
});

test("VueUse metadata resolves from the working project's declared package", async (context) => {
	const directory = await fixture(context);
	const module = path.join(directory, "node_modules/@vueuse/core");
	await mkdir(module, { recursive: true });
	await writeFile(path.join(module, "package.json"), JSON.stringify({ name: "@vueuse/core", version: "15.0.0", type: "module", exports: { ".": "./index.mjs", "./indexes.json": "./indexes.json" } }));
	await writeFile(path.join(module, "index.mjs"), "export const useSyntheticCore = () => 42;");
	await writeFile(path.join(module, "indexes.json"), JSON.stringify({ functions: [{ name: "useSyntheticCore", package: "core" }] }));
	const before = process.cwd();
	process.chdir(directory);
	try {
		const code = "export const value = useSyntheticCore()";
		const filename = path.join(directory, "fixture.ts");
		const options = { imports: ["@vueuse/core"] };
		const expected = await transform(originalPlugin, code, filename, options);
		const actual = await transform(currentPlugin, code, filename, options);
		assert.equal(actual.code, expected.code);
		assert.match(actual.code, /import \{ useSyntheticCore \} from '@vueuse\/core'/);
	}
	finally {
		process.chdir(before);
	}
});

test("a production Vite build scans local composables and emits executable lazy chunks and declarations", async () => {
	const built = await buildImportFixture();
	try {
		assert.ok(built.directory.startsWith(projectRoot));
	}
	finally {
		await built.dispose();
	}
});

test("TypeScript 6 and 7 check the actual Vite entrypoint with library checking enabled", async (context) => {
	const directory = await fixture(context);
	const filename = path.join(directory, "consumer.mts");
	const configuration = path.join(directory, "tsconfig.json");
	await writeFile(configuration, JSON.stringify({ compilerOptions: { noEmit: true, strict: true, skipLibCheck: false, module: "ESNext", moduleResolution: "Bundler", target: "ES2023", types: ["node"] }, files: [filename] }));
	const valid = "import AutoImport from \"unplugin-auto-import/vite\"; import type { PluginOption } from \"vite\"; const plugin: PluginOption = AutoImport({ imports: [\"vue\"], dts: false, vueTemplate: true, parser: \"acorn\" });";
	const invalid = "import AutoImport from \"unplugin-auto-import/vite\"; AutoImport({ vueTemplate: \"invalid\" });";
	for (const compiler of [require.resolve("typescript/bin/tsc"), path.join(projectRoot, "back-end/scripts/run-typescript.mjs")]) {
		for (const [contents, accepted] of [[valid, true], [invalid, false]]) {
			await writeFile(filename, contents);
			const result = spawnSync(process.execPath, [compiler, "--project", configuration], { cwd: projectRoot, encoding: "utf8", timeout: 120000, maxBuffer: 512 * 1024 });
			assert.equal(result.status === 0, accepted, result.stdout + result.stderr);
			if (!accepted) assert.match(result.stdout + result.stderr, /TS\d+/);
		}
	}
});
