import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const repositoryRoot = process.env.RESTORATION_RUNTIME_ROOT
	? path.resolve(process.env.RESTORATION_RUNTIME_ROOT)
	: path.resolve(import.meta.dirname, "..");
const require = createRequire(path.join(repositoryRoot, "back-end/package.json"));
const rootManifest = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
function isInsideRuntime(target) {
	const relative = path.relative(repositoryRoot, target);
	return relative !== ""
		&& relative !== ".."
		&& !relative.startsWith(`..${path.sep}`)
		&& !path.isAbsolute(relative);
}

for (const packageName of [
	"dotenv",
	"express",
	"express-rate-limit",
	"helmet",
	"nodemailer",
	"zod"
]) {
	assert.equal(
		isInsideRuntime(require.resolve(packageName)),
		true,
		`${packageName} must resolve from inside the production artifact.`
	);
}

for (const packageName of ["cypress", "eslint", "puppeteer", "tsx", "typescript", "vite", "vitest", "vue"]) {
	try {
		assert.equal(
			isInsideRuntime(require.resolve(packageName)),
			false,
			`${packageName} must not be installed in production.`
		);
	}
	catch (error) {
		if (error?.code !== "MODULE_NOT_FOUND") throw error;
	}
}

for (const manifestPath of ["package.json", "back-end/package.json", "front-end/package.json"]) {
	const manifest = JSON.parse(await readFile(path.join(repositoryRoot, manifestPath), "utf8"));
	for (const packageName of ["cypress", "eslint", "puppeteer", "tsx", "typescript", "vite", "vitest"]) {
		assert.equal(
			Object.hasOwn(manifest.dependencies ?? {}, packageName),
			false,
			`${manifestPath} must keep ${packageName} out of direct production dependencies.`
		);
	}
}

for (const relativePath of [
	"back-end/dist/server.js",
	"back-end/package.json",
	"front-end/dist/index.html",
	".restoration-release-prepared.json"
]) {
	await access(path.join(repositoryRoot, relativePath));
}

const marker = JSON.parse(
	await readFile(path.join(repositoryRoot, ".restoration-release-prepared.json"), "utf8")
);
assert.equal(marker.release, `v${rootManifest.version}`);
assert.match(marker.commitSha, /^[0-9a-f]{40}$/u);
assert.match(marker.preparedAt, /^\d{4}-\d{2}-\d{2}T/u);

console.log(JSON.stringify({
	productionInstall: "passed",
	release: marker.release,
	commitSha: marker.commitSha,
	runtime: "direct-node"
}));
