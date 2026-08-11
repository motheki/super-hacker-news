import { defineOxlintConfig } from "@pajecawav/tools";

export default defineOxlintConfig({
	ignorePatterns: ["**/.next", "**/.direnv", "**/.devenv"],
	rules: {
		"typescript/no-unsafe-type-assertion": "off",
	},
});
