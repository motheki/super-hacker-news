import { expect, test } from "bun:test";
import { loadDescendants } from "./tree";
import type { OfficialItem } from "./codec";

test("loads descendants added by a short first batch", async () => {
  const items = new Map<number, OfficialItem>([
    [2, { id: 2, kids: [3], parent: 1, type: "comment" }],
    [3, { id: 3, parent: 2, type: "comment" }],
  ]);
  const root: OfficialItem = { id: 1, kids: [2], type: "story" };

  const result = await loadDescendants(
    root,
    (id) => Promise.resolve(items.get(id) ?? null),
    24,
  );

  expect([...result.items.keys()]).toEqual([2, 3]);
  expect(result.missingIds).toEqual([]);
});

test("reports descendants that could not be loaded", async () => {
  const root: OfficialItem = { id: 1, kids: [2], type: "story" };

  const result = await loadDescendants(root, () => Promise.resolve(null), 24);

  expect(result.items.size).toBe(0);
  expect(result.missingIds).toEqual([2]);
});
