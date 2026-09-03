import babelParser from "@babel/eslint-parser";
import babelTypeScript from "@babel/preset-typescript";
import eslint from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

const sourceFiles = ["**/*.{ts,tsx}"];

export default defineConfig([
  eslint.configs.recommended,
  {
    files: sourceFiles,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parser: babelParser,
      parserOptions: {
        babelOptions: {
          babelrc: false,
          configFile: false,
          presets: [[babelTypeScript, { allExtensions: true, isTSX: true }]],
        },
        requireConfigFile: false,
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
  reactHooks.configs.flat["recommended-latest"],
  jsxA11y.flatConfigs.recommended,
  nextPlugin.configs["core-web-vitals"],
  prettier,
  globalIgnores([
    ".next/**",
    ".devenv/**",
    ".direnv/**",
    "build/**",
    "next-env.d.ts",
    "out/**",
  ]),
]);
