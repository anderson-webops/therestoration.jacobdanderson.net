import { writeFile } from "node:fs/promises";
import process from "node:process";
import packageManifest from "../package.json" with { type: "json" };

const release = process.env.RESTORATION_RELEASE?.trim() ?? "";
const commitSha = process.env.RESTORATION_COMMIT_SHA?.trim() ?? "";
const deployedAt = process.env.RESTORATION_DEPLOYED_AT?.trim() ?? "";
const expectedRelease = `v${packageManifest.version}`;

if (release !== expectedRelease || !/^v\d+\.\d+\.\d+$/u.test(release)) {
	throw new Error(`RESTORATION_RELEASE must be exactly ${expectedRelease}.`);
}
if (!/^[0-9a-f]{40}$/u.test(commitSha)) {
	throw new Error("RESTORATION_COMMIT_SHA must be a full lowercase Git revision.");
}
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(deployedAt) || Number.isNaN(Date.parse(deployedAt))) {
	throw new Error("RESTORATION_DEPLOYED_AT must be a valid UTC timestamp.");
}

await writeFile(
	new URL("../.restoration-release-prepared.json", import.meta.url),
	`${JSON.stringify({ release, commitSha, deployedAt }, null, 2)}\n`,
	{ mode: 0o600 }
);

console.log(`Prepared release identity ${release} (${commitSha}).`);
