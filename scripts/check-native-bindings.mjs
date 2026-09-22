#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { findResolvedPackage, resolveWorkspacePackage } from "./native-binding-lock.mjs";

const projectRoot = resolve(import.meta.dirname, "..");
const lockfile = JSON.parse(readFileSync(resolve(projectRoot, "package-lock.json"), "utf8"));
const frontendManifest = JSON.parse(readFileSync(resolve(projectRoot, "front-end/package.json"), "utf8"));
const packages = lockfile.packages || {};
const frontendLockEntry = packages["front-end"];
const directBindingFamilies = [
	{
		parent: "oxc-parser",
		bindings: ["@oxc-parser/binding-linux-arm64-gnu", "@oxc-parser/binding-linux-arm64-musl"]
	},
	{
		parent: "rolldown",
		bindings: ["@rolldown/binding-linux-arm64-gnu", "@rolldown/binding-linux-arm64-musl"]
	},
	{
		parent: "rollup",
		bindings: ["@rollup/rollup-linux-arm64-gnu", "@rollup/rollup-linux-arm64-musl"]
	}
];
const nativeBindingPattern
	= /^(?:@esbuild\/linux-arm64|@oxc-parser\/binding-linux-arm64-(?:gnu|musl)|@oxfmt\/binding-linux-arm64-(?:gnu|musl)|@rolldown\/binding-linux-arm64-(?:gnu|musl)|@rollup\/rollup-linux-arm64-(?:gnu|musl)|lightningcss-linux-arm64-(?:gnu|musl))$/;

function assert(condition, message) {
	if (!condition) throw new Error(message);
}

function expectedLibc(packageName) {
	if (packageName.endsWith("-musl")) return "musl";
	if (packageName.endsWith("-gnu")) return "glibc";
	return undefined;
}

assert(lockfile.lockfileVersion === 3, "package-lock.json must use lockfile v3");
assert(frontendLockEntry, "package-lock.json must contain the front-end workspace importer");

for (const family of directBindingFamilies) {
	const resolvedParent = resolveWorkspacePackage(packages, "front-end", family.parent);
	assert(resolvedParent, `package-lock.json must resolve ${family.parent} for the front-end workspace`);
	const [parentPath, parentMetadata] = resolvedParent;
	const parentVersion = parentMetadata.version;
	for (const packageName of family.bindings) {
		assert(
			frontendManifest.optionalDependencies?.[packageName] === parentVersion,
			`front-end/package.json must pin ${packageName}@${parentVersion}`
		);
		assert(
			frontendLockEntry.optionalDependencies?.[packageName] === parentVersion,
			`package-lock.json must pin the front-end optional dependency ${packageName}@${parentVersion}`
		);
		assert(
			findResolvedPackage(packages, packageName, parentVersion),
			`package-lock.json must resolve ${packageName}@${parentVersion} for ${parentPath}`
		);
	}
}

const requiredBindings = [];
for (const [parentPath, parentMetadata] of Object.entries(packages)) {
	for (const [packageName, declaredVersion] of Object.entries(parentMetadata.optionalDependencies || {})) {
		if (!nativeBindingPattern.test(packageName)) continue;
		requiredBindings.push({
			parentPath,
			packageName,
			version: declaredVersion
		});
	}
}

assert(requiredBindings.length > 0, "The lockfile does not declare any Linux ARM64 native bindings");
for (const required of requiredBindings) {
	const resolved = findResolvedPackage(packages, required.packageName, required.version);
	assert(
		resolved,
		`Missing deploy-native lock entry: ${required.packageName}@${required.version} required by ${required.parentPath}`
	);
	const [resolvedPath, binding] = resolved;
	assert(
		binding.version === required.version,
		`${resolvedPath} must match its parent package at ${required.version}`
	);
	assert(binding.optional === true, `${resolvedPath} must remain optional`);
	assert(binding.cpu?.includes("arm64"), `${resolvedPath} must target arm64`);
	assert(binding.os?.includes("linux"), `${resolvedPath} must target Linux`);
	const libc = expectedLibc(required.packageName);
	if (libc) assert(binding.libc?.includes(libc), `${resolvedPath} must target ${libc}`);
	assert(
		typeof binding.integrity === "string" && binding.integrity.startsWith("sha512-"),
		`${resolvedPath} must include registry integrity metadata`
	);
	assert(
		typeof binding.resolved === "string" && binding.resolved.startsWith("https://registry.npmjs.org/"),
		`${resolvedPath} must resolve from the npm registry over HTTPS`
	);
}

console.log(`Native binding lockfile check passed for ${requiredBindings.length} Linux ARM64 packages.`);
