import { describe, expect, it } from "vitest";

import { parseDeploymentIdentity, parsePublicOrigin } from "../src/deployment.js";

const expectedRelease = "v4.0.0";
const productionIdentity = {
	NODE_ENV: "production",
	RESTORATION_RELEASE: expectedRelease,
	RESTORATION_COMMIT_SHA: "0123456789abcdef0123456789abcdef01234567",
	RESTORATION_DEPLOYED_AT: "2026-08-02T00:00:00.000Z"
};

describe("production deployment configuration", () => {
	it("requires an exact source release, full revision, and timestamp", () => {
		expect(parseDeploymentIdentity(productionIdentity, expectedRelease)).toEqual({
			release: expectedRelease,
			commitSha: productionIdentity.RESTORATION_COMMIT_SHA,
			deployedAt: productionIdentity.RESTORATION_DEPLOYED_AT
		});

		expect(() => parseDeploymentIdentity({ ...productionIdentity, RESTORATION_RELEASE: "v3.1.5" }, expectedRelease))
			.toThrow(/exactly match/);
		expect(() => parseDeploymentIdentity({ ...productionIdentity, RESTORATION_COMMIT_SHA: "short" }, expectedRelease))
			.toThrow(/full lowercase 40-character/);
		expect(() => parseDeploymentIdentity({ ...productionIdentity, RESTORATION_DEPLOYED_AT: "yesterday" }, expectedRelease))
			.toThrow(/ISO-8601/);
	});

	it("uses an explicit development identity only outside production", () => {
		expect(parseDeploymentIdentity({}, expectedRelease)).toEqual({
			release: "development",
			commitSha: "development",
			deployedAt: null
		});
		expect(() => parseDeploymentIdentity({ NODE_ENV: "production" }, expectedRelease)).toThrow();
	});

	it("requires the canonical HTTPS origin in production", () => {
		expect(parsePublicOrigin("https://therestoration.jacobdanderson.net", true)).toBe(
			"https://therestoration.jacobdanderson.net"
		);
		expect(() => parsePublicOrigin(undefined, true)).toThrow(/required/);
		expect(() => parsePublicOrigin("http://therestoration.jacobdanderson.net", true)).toThrow(/HTTPS/);
		expect(() => parsePublicOrigin("https://therestoration.jacobdanderson.net/path", true)).toThrow(/origin/);
	});
});
