import { expect, test } from "bun:test";
import { loadDescendants } from "./tree";
import type { OfficialItem } from "./codec";

test("loads descendants added by a short first batch", async () => {
  const items = new Map<number, OfficialItem>([
    [2, { id: 2, kids: [3], parent: 1, type: "comment" }],
    [3, { id: 3, parent: 2, type: "comment" }],
  ]);
  const root: OfficialItem = { id: 1, kids: [2], type: "story" };

  const descendants = await loadDescendants(
    root,
    (id) => Promise.resolve(items.get(id) ?? null),
    24,
  );

  expect([...descendants.keys()]).toEqual([2, 3]);
});
