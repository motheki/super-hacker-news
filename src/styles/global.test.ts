import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";

const STYLES = new URL("./global.css", import.meta.url);
const REPLIES_RULE = /\.replies\s*\{(?<declarations>[^}]+)\}/gu;

test("reply rails align with the parent content edge", async () => {
  const css = await readFile(STYLES, "utf8");
  const rules = [...css.matchAll(REPLIES_RULE)];
  const baseRule = rules[0]?.groups?.declarations;

  expect(baseRule).toContain("margin-left: 0");

  for (const rule of rules.slice(1)) {
    expect(rule.groups?.declarations).not.toContain("margin-left");
  }
});
