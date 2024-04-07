import antfu from "@antfu/eslint-config";

export default antfu({
	root: true,
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:vue/vue3-essential",
		"@vue/typescript",
		"plugin:react-hooks/recommended",
	],
	parser: "@typescript-eslint/parser",
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		ecmaFeatures: {
			jsx: true,
		},
	},
	stylistic: {
		indent: "tab",
		quotes: "double",
		semi: true,
		linebreak: "unix",
	},
	overrides: [
		{
			files: [
				".eslintrc.{js,cjs}",
			],
			env: {
				node: true,
			},
			parserOptions: {
				sourceType: "script",
			},
		},
	],
	ignores: [
		"node_modules",
		"dist",
	],
	// Additional configurations and customizations
	formatters: {
		css: true, // Enables formatting for CSS files
		html: true, // Enables formatting for HTML files
		markdown: "prettier", // Uses Prettier for formatting Markdown files
	},
	// Explicitly enabling TypeScript and Vue to ensure they are processed correctly
	typescript: true,
	vue: true,
	yaml: true,
	jsonc: false,
});
