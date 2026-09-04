import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const STYLES = new URL("./global.css", import.meta.url);
const REPLIES_RULE = /\.replies\s*\{(?<declarations>[^}]+)\}/gu;

function declarations(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{(?<body>[^}]+)\\}`, "u").exec(css);

  return match?.groups?.body ?? "";
}

test("reply rails align with the parent content edge", async () => {
  const css = await readFile(STYLES, "utf8");
  const rules = [...css.matchAll(REPLIES_RULE)];
  const baseRule = rules[0]?.groups?.declarations;

  expect(baseRule).toContain("margin-left: 0");

  for (const rule of rules.slice(1)) {
    expect(rule.groups?.declarations).not.toContain("margin-left");
  }
});

test("feed numbers use stable column widths", async () => {
  const css = await readFile(STYLES, "utf8");

  expect(declarations(css, ".feed-index")).toContain(
    "font-variant-numeric: tabular-nums",
  );
});

test("touch controls avoid delayed gesture handling", async () => {
  const css = await readFile(STYLES, "utf8");

  expect(css).toContain("touch-action: manipulation");
});

test("comment anchors clear the viewport edge", async () => {
  const css = await readFile(STYLES, "utf8");

  expect(declarations(css, ".comment")).toContain("scroll-margin-top");
  expect(declarations(css, "#comments")).toContain("scroll-margin-top");
});
