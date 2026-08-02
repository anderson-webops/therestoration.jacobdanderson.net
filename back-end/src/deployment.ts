export interface DeploymentIdentity {
	release: string;
	commitSha: string;
	deployedAt: string | null;
}

const RELEASE_PATTERN = /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/;

function trimmed(value: string | undefined) {
	return value?.trim() || undefined;
}

function parseDeployedAt(value: string | undefined) {
	const deployedAt = trimmed(value);
	if (!deployedAt || Number.isNaN(Date.parse(deployedAt))) {
		throw new TypeError("RESTORATION_DEPLOYED_AT must be a valid ISO-8601 timestamp.");
	}
	return deployedAt;
}

export function parseDeploymentIdentity(
	environment: NodeJS.ProcessEnv,
	expectedRelease: string
): DeploymentIdentity {
	if (!RELEASE_PATTERN.test(expectedRelease)) {
		throw new TypeError("The source package version must produce a valid v-prefixed release.");
	}

	const release = trimmed(environment.RESTORATION_RELEASE);
	const commitSha = trimmed(environment.RESTORATION_COMMIT_SHA);
	const deployedAt = trimmed(environment.RESTORATION_DEPLOYED_AT);
	const hasConfiguredIdentity = Boolean(release || commitSha || deployedAt);

	if (environment.NODE_ENV !== "production" && !hasConfiguredIdentity) {
		return {
			release: "development",
			commitSha: "development",
			deployedAt: null
		};
	}

	if (release !== expectedRelease) {
		throw new TypeError(`RESTORATION_RELEASE must exactly match ${expectedRelease}.`);
	}
	if (!commitSha || !COMMIT_PATTERN.test(commitSha)) {
		throw new TypeError("RESTORATION_COMMIT_SHA must be a full lowercase 40-character Git revision.");
	}

	return {
		release,
		commitSha,
		deployedAt: parseDeployedAt(deployedAt)
	};
}

export function parsePublicOrigin(value: string | undefined, isProduction: boolean) {
	const configuredOrigin = trimmed(value);
	if (!configuredOrigin) {
		if (isProduction) {
			throw new TypeError("RESTORATION_PUBLIC_ORIGIN is required in production.");
		}
		return undefined;
	}

	let url: URL;
	try {
		url = new URL(configuredOrigin);
	}
	catch {
		throw new TypeError("RESTORATION_PUBLIC_ORIGIN must be an absolute URL.");
	}
	if (
		url.username
		|| url.password
		|| url.pathname !== "/"
		|| url.search
		|| url.hash
		|| (isProduction && url.protocol !== "https:")
	) {
		throw new TypeError(
			"RESTORATION_PUBLIC_ORIGIN must contain only the canonical HTTPS origin in production."
		);
	}
	return url.origin;
}
