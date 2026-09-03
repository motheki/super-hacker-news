import eslint from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import astro from "eslint-plugin-astro";
import globals from "globals";
import tseslint from "typescript-eslint";

const typeScriptFiles = ["**/*.ts"];

export default defineConfig([
  eslint.configs.recommended,
  ...astro.configs["flat/recommended"],
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: typeScriptFiles,
  })),
  {
    files: typeScriptFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  prettier,
  globalIgnores([
    ".astro/**",
    ".devenv/**",
    ".direnv/**",
    ".wrangler/**",
    "dist/**",
    "**/worker-configuration.d.ts",
  ]),
]);
