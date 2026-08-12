import { describe, expect, test } from "bun:test";
import { type HackerNewsItemReference, resolveRootItemId } from "./item";

const loaderFor = (items: readonly HackerNewsItemReference[]) => {
  const itemById = new Map(items.map((item) => [item.id, item]));
  return (itemId: number) => Promise.resolve(itemById.get(itemId) ?? null);
};

describe("resolveRootItemId", () => {
  test("returns a story ID unchanged", async () => {
    const loadItem = loaderFor([{ id: 10, type: "story" }]);
    expect(await resolveRootItemId(10, loadItem)).toBe(10);
  });

  test("walks nested comment parents to their root story", async () => {
    const loadItem = loaderFor([
      { id: 30, parent: 20, type: "comment" },
      { id: 20, parent: 10, type: "comment" },
      { id: 10, type: "story" },
    ]);
    expect(await resolveRootItemId(30, loadItem)).toBe(10);
  });

  test("rejects missing parents and cycles", async () => {
    const missingParent = loaderFor([{ id: 30, parent: 20, type: "comment" }]);
    expect(await resolveRootItemId(30, missingParent)).toBeNull();

    const cycle = loaderFor([
      { id: 30, parent: 20, type: "comment" },
      { id: 20, parent: 30, type: "comment" },
    ]);
    expect(await resolveRootItemId(30, cycle)).toBeNull();
  });
});
