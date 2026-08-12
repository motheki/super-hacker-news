import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
    suspicious: "error",
    pedantic: "error",
  },
  options: {
    typeAware: true,
    typeCheck: true,
  },
  rules: {
    "eslint/no-unused-vars": "error",
  },
  ignorePatterns: [
    "dist/**",
    "coverage/**",
    "vendor/**",
    "test/snapshots/**",
    "node_modules/**",
    ".direnv/*",
    ".devenv/*",
    "flake.nix",
  ],
});
