export function resolveWorkspacePackage(packages, workspacePath, packageName) {
	const candidates = [
		`${workspacePath}/node_modules/${packageName}`,
		`node_modules/${packageName}`
	];

	for (const packagePath of candidates) {
		const metadata = packages[packagePath];
		if (metadata && typeof metadata.version === "string") {
			return [packagePath, metadata];
		}
	}

	return undefined;
}

export function findResolvedPackage(packages, packageName, version) {
	return Object.entries(packages).find(([packagePath, metadata]) => {
		const matchesName = packagePath === `node_modules/${packageName}`
			|| packagePath.endsWith(`/node_modules/${packageName}`);
		return matchesName && metadata.version === version;
	});
}
