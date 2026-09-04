import { describe, expect, test } from "bun:test";
import type { HackerNewsItemReference } from "~/lib/item";
import type { Post } from "~/lib/post";
import { resolvePostTarget } from "./post-target";

const STORY_ID = 10;
const COMMENT_ID = 30;

const POST: Post = {
  comments: [],
  comments_count: 0,
  id: STORY_ID,
  points: 1,
  time: 1,
  time_ago: "now",
  title: "Story",
  user: "alice",
};

describe("resolvePostTarget", () => {
  test("loads stories without walking parents", async () => {
    const result = await resolvePostTarget(
      STORY_ID,
      () => Promise.resolve({ id: STORY_ID, type: "story" }),
      () => Promise.resolve(POST),
    );

    expect(result).toEqual({ kind: "post", post: POST });
  });

  test("redirects comments to their story", async () => {
    const items = new Map<number, HackerNewsItemReference>([
      [COMMENT_ID, { id: COMMENT_ID, parent: 20, type: "comment" }],
      [20, { id: 20, parent: STORY_ID, type: "comment" }],
      [STORY_ID, { id: STORY_ID, type: "story" }],
    ]);

    const result = await resolvePostTarget(
      COMMENT_ID,
      (id) => Promise.resolve(items.get(id) ?? null),
      () => Promise.reject(new Error("post loader must not run")),
    );

    expect(result).toEqual({ kind: "redirect", rootId: STORY_ID });
  });

  test("redirects when a provider resolves a comment to its story", async () => {
    let itemReads = 0;
    const result = await resolvePostTarget(
      COMMENT_ID,
      () => {
        itemReads += 1;
        return Promise.resolve(null);
      },
      () => Promise.resolve(POST),
    );

    expect(result).toEqual({ kind: "redirect", rootId: STORY_ID });
    expect(itemReads).toBe(0);
  });
});
