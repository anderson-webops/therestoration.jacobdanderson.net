#!/usr/bin/env node
import { access, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { isAbsolute, relative, resolve } from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const nodeModulesRoot = resolve(projectRoot, "node_modules");
const selectionPath = process.argv[2];
if (!selectionPath) throw new TypeError("A JSON selection file is required.");

const selection = JSON.parse(await readFile(resolve(projectRoot, selectionPath), "utf8"));
if (!Array.isArray(selection)) throw new TypeError("The dependency selection must be an array.");

const backendManifestPath = resolve(projectRoot, "back-end/package.json");
const backendManifest = JSON.parse(await readFile(backendManifestPath, "utf8"));
const requiredDependencies = new Set(Object.keys(backendManifest.dependencies || {}));
const removalTargets = new Set();

for (const dependency of selection) {
	const location = dependency?.location;
	if (typeof location !== "string" || isAbsolute(location)) {
		throw new TypeError("Every selected dependency must have a relative location.");
	}
	const target = resolve(projectRoot, location);
	const relativeTarget = relative(nodeModulesRoot, target);
	if (!relativeTarget || relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) continue;
	if (requiredDependencies.has(dependency.name)) {
		throw new Error(`Refusing to prune required production dependency ${dependency.name}.`);
	}
	removalTargets.add(target);
}

for (const target of [...removalTargets].sort((left, right) => right.length - left.length)) {
	await rm(target, { force: true, recursive: true });
}
await rm(resolve(nodeModulesRoot, ".bin"), { force: true, recursive: true });

const requireFromBackend = createRequire(backendManifestPath);
for (const dependency of requiredDependencies) requireFromBackend.resolve(dependency);

const forbiddenRuntimePackages = [
	"@antfu/eslint-config",
	"cypress",
	"eslint",
	"pinia",
	"puppeteer",
	"rolldown",
	"rollup",
	"typescript",
	"vite",
	"vitest"
];
for (const packageName of forbiddenRuntimePackages) {
	try {
		await access(resolve(nodeModulesRoot, packageName));
		throw new Error(`${packageName} remained in the production dependency tree.`);
	}
	catch (error) {
		if (error?.code !== "ENOENT") throw error;
	}
}

console.log(`Pruned ${removalTargets.size} development or extraneous packages from the production tree.`);
