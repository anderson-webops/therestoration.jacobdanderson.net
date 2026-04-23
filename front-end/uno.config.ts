import { createLocalFontProcessor } from "@unocss/preset-web-fonts/local";
import presetAttributify from "@unocss/preset-attributify";
import presetIcons from "@unocss/preset-icons";
import presetTypography from "@unocss/preset-typography";
import presetWebFonts from "@unocss/preset-web-fonts";
import presetWind3 from "@unocss/preset-wind3";
import transformerDirectives from "@unocss/transformer-directives";
import transformerVariantGroup from "@unocss/transformer-variant-group";

export default {
	shortcuts: [
		[
			"btn",
			"px-4 py-1 rounded inline-block bg-teal-700 text-white cursor-pointer !outline-none hover:bg-teal-800 disabled:cursor-default disabled:bg-gray-600 disabled:opacity-50",
		],
		[
			"icon-btn",
			"inline-block cursor-pointer select-none opacity-75 transition duration-200 ease-in-out hover:opacity-100 hover:text-teal-600",
		],
	],
	presets: [
		presetWind3(),
		presetAttributify(),
		presetIcons({
			scale: 1.2,
		}),
		presetTypography(),
		presetWebFonts({
			fonts: {
				sans: "DM Sans",
				serif: "DM Serif Display",
				mono: "DM Mono",
			},
			processors: createLocalFontProcessor(),
		})
	],
	transformers: [transformerDirectives(), transformerVariantGroup()],
	safelist: "prose prose-sm m-auto text-left".split(" "),
};
