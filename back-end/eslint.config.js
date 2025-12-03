// back-end/eslint.config.js
import importFull from "eslint-plugin-import";
import globals from "globals";
import ts from "typescript-eslint";
import base from "../eslint.config.js";

export default base.append(
	{
		files: ["**/*.ts"],
		plugins: { "import-ext": importFull },
		languageOptions: {
			parser: ts.parser,
			parserOptions: { project: "./tsconfig.json", sourceType: "module" },
			globals: { ...globals.node },
		},
		rules: {
			// full-fat rule lives on the new prefix
			// "import-ext/extensions": ["error", "always", { js: "always", ts: "always" }],
			// can still tap into lite rules via the old name
			// "import-ext/no-unresolved": ["error", { ignore: ["\\.vue$"] }],
			"new-cap": "off",
		},
		settings: {
			"import/resolver": {
				typescript: { project: "./tsconfig.json" },
				node: { extensions: [".js", ".ts"] },
			},
		},
	},
	{ files: ["**/*.{js,cjs,mjs}"], languageOptions: { globals: { ...globals.node } } },
	{ ignores: ["dist/**"] },
);
