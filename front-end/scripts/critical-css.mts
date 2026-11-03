import Beasties from "beasties-renderer";

function failBuild(message: unknown): never {
	throw new Error(`Critical CSS generation failed: ${String(message)}`);
}

export function createCriticalCssRenderer(directory: string) {
	return (html: string): Promise<string> => {
		const renderer = new Beasties({
			path: directory,
			external: true,
			remote: false,
			preload: "body",
			pruneSource: false,
			reduceInlineStyles: false,
			dedupeWarnings: false,
			logger: { ...console, warn: failBuild, error: failBuild }
		});
		return renderer.process(html);
	};
}
