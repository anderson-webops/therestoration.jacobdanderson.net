import { expect, it } from "vitest";

import { findResolvedPackage, resolveWorkspacePackage } from "./native-binding-lock.mjs";

it("prefers the workspace package that Node loads first", () => {
	const packages = {
		"node_modules/rolldown": { version: "1.2.8" },
		"front-end/node_modules/rolldown": { version: "1.2.9" }
	};

	expect(resolveWorkspacePackage(packages, "front-end", "rolldown")).toEqual([
		"front-end/node_modules/rolldown",
		{ version: "1.2.9" }
	]);
});

it("falls back to a hoisted package", () => {
	const packages = {
		"node_modules/rollup": { version: "4.63.4" }
	};

	expect(resolveWorkspacePackage(packages, "front-end", "rollup")).toEqual([
		"node_modules/rollup",
		{ version: "4.63.4" }
	]);
	expect(resolveWorkspacePackage(packages, "front-end", "missing")).toBeUndefined();
});

it("finds nested and hoisted bindings at the required version", () => {
	const packages = {
		"node_modules/@rolldown/binding-linux-arm64-gnu": { version: "1.2.8" },
		"front-end/node_modules/@rolldown/binding-linux-arm64-gnu": { version: "1.2.9" }
	};

	expect(
		findResolvedPackage(packages, "@rolldown/binding-linux-arm64-gnu", "1.2.9")
	).toEqual(["front-end/node_modules/@rolldown/binding-linux-arm64-gnu", { version: "1.2.9" }]);
});
