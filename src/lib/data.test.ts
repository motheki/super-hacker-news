import { describe, expect, spyOn, test } from "bun:test";
import type { HackerNewsItemReference } from "~/lib/item";
import type { Post } from "~/lib/post";
import { getPostTarget } from "./data";

const POST_ID = 8_863;
const POST: Post = {
  comments: [],
  comments_count: 0,
  id: POST_ID,
  points: 10,
  time: 1_700_000_000,
  time_ago: "2 minutes ago",
  title: "Story",
  user: "alice",
};

function createPost(commentsCount: number): Post {
  return {
    ...POST,
    comments: Array.from({ length: commentsCount }, (_, index) => ({
      comments: [],
      comments_count: 0,
      id: POST_ID + index + 1,
    })),
    comments_count: commentsCount,
  };
}

describe("getPostTarget", () => {
  test("uses one data-service request for a materialized post", async () => {
    let requests = 0;
    const target = await getPostTarget(POST_ID, {
      fetch: () => {
        requests += 1;
        return Promise.resolve(Response.json({ kind: "post", post: POST }));
      },
    });

    expect(target).toEqual({ kind: "post", post: POST });
    expect(requests).toBe(1);
  });

  test("retains the official and provider fallback", async () => {
    let itemReads = 0;
    let postReads = 0;
    const target = await getPostTarget(
      POST_ID,
      { fetch: () => Promise.resolve(new Response(null, { status: 503 })) },
      {
        loadItem: () => {
          itemReads += 1;
          return Promise.resolve({
            id: POST_ID,
            type: "story",
          } satisfies HackerNewsItemReference);
        },
        loadPost: () => {
          postReads += 1;
          return Promise.resolve(POST);
        },
      },
    );

    expect(target).toEqual({ kind: "post", post: POST });
    expect(itemReads).toBe(1);
    expect(postReads).toBe(1);
  });

  test("serves a stale materialization without calling providers", async () => {
    const stalePost = createPost(35);
    let itemReads = 0;
    let postReads = 0;
    const target = await getPostTarget(
      POST_ID,
      {
        fetch: () =>
          Promise.resolve(
            Response.json(
              { kind: "post", post: stalePost },
              { headers: { "x-super-hn-stale": "1" } },
            ),
          ),
      },
      {
        loadItem: () => {
          itemReads += 1;
          return Promise.resolve({ id: POST_ID, type: "story" } as const);
        },
        loadPost: () => {
          postReads += 1;
          return Promise.resolve(createPost(62));
        },
      },
    );

    expect(target).toEqual({ kind: "post", post: stalePost });
    expect(itemReads).toBe(0);
    expect(postReads).toBe(0);
  });

  test("logs the post source and durations", async () => {
    const logs: string[] = [];
    const info = spyOn(console, "info").mockImplementation((message) => {
      logs.push(String(message));
    });

    try {
      await getPostTarget(POST_ID, {
        fetch: () =>
          Promise.resolve(Response.json({ kind: "post", post: POST })),
      });
    } finally {
      info.mockRestore();
    }

    const entry = logs
      .map((message) => JSON.parse(message) as Record<string, unknown>)
      .find(({ event }) => event === "hn.post_load");
    expect(entry).toMatchObject({
      commentsCount: 0,
      event: "hn.post_load",
      postId: POST_ID,
      source: "service-fresh",
    });
    expect(entry?.serviceDurationMs).toEqual(expect.any(Number));
  });
});
