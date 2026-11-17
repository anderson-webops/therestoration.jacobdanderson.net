// ./eslint.config.js  ← monorepo root
import antfu from "@antfu/eslint-config";

export default antfu(
	{
		root: true,
		env: { browser: true, node: true, es2021: true },
		unocss: true,
		stylistic: { indent: "tab", quotes: "double", semi: true, linebreak: "unix" },
		formatters: {
			prettier: {
				tabWidth: 4,
				useTabs: true,
				trailingComma: "none",
				printWidth: 120,
				endOfLine: "lf"
			}
		},
		ignores: [
			"**/*.d.ts",
			"scripts/*build-toolchain*.mjs",
			"scripts/check-toolchain-package.mjs",
			"scripts/test-npm-tool-majors.mjs",
			"scripts/test-picomatch-compat.mjs",
			"scripts/test-picomatch-install.mjs"
		],
		rules: {
			"no-console": "off",
			"antfu/if-newline": "off",
			"antfu/reasonable-newline": "off",
			"style/comma-dangle": "off"
		}
	},
	{
		files: ["README.md", "README.zh-CN.md"],
		rules: {
			"markdown/heading-increment": "off"
		}
	}
);
