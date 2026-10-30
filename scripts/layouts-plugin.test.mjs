import { fileURLToPath } from "node:url";

import { expect, it } from "vitest";
import Layouts from "vite-plugin-vue-layouts-next";

it("expands excluded layout braces without dropping the default layout", async () => {
	const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
	const plugin = Layouts({
		layoutsDirs: "front-end/src/layouts",
		exclude: ["**/{home,404}.vue"],
		importMode: () => "sync"
	});
	plugin.configResolved({ root: repositoryRoot });
	const result = await plugin.load("/@vite-plugin-vue-layouts-next/generated-layouts");

	expect(result.code).toContain("default.vue");
	expect(result.code).not.toContain("home.vue");
	expect(result.code).not.toContain("404.vue");
});
