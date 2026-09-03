import { describe, expect, test } from "bun:test";
import type { OfficialItem } from "~/lib/hacker-news/codec";
import { materialize } from "../workers/hn-data/src/materializer";

const ROOT_ID = 1;
const NOW = 1_700_000_100;

const root: OfficialItem = {
  by: "alice",
  descendants: 2,
  id: ROOT_ID,
  kids: [2],
  score: 10,
  time: 1_700_000_000,
  title: "Story",
  type: "story",
};

const child: OfficialItem = {
  by: "bob",
  id: 2,
  kids: [3],
  parent: ROOT_ID,
  text: "First",
  time: 1_700_000_010,
  type: "comment",
};

describe("materialize", () => {
  test("reports every missing reachable item", () => {
    const result = materialize(root, new Map([[child.id, child]]), NOW);

    expect(result.missingIds).toEqual([3]);
    expect(result.post).toBeNull();
  });

  test("builds a complete normalized comment tree", () => {
    const leaf: OfficialItem = {
      by: "carol",
      id: 3,
      parent: child.id,
      text: "Reply",
      time: 1_700_000_020,
      type: "comment",
    };
    const items = new Map([
      [child.id, child],
      [leaf.id, leaf],
    ]);

    const result = materialize(root, items, NOW);

    expect(result.missingIds).toEqual([]);
    expect(result.post?.comments_count).toBe(2);
  });
});
