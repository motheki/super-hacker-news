import { describe, expect, test } from "bun:test";
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

  test("refreshes a stale materialization with the live tree", async () => {
    const stalePost = createPost(35);
    const livePost = createPost(62);
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
        loadItem: () =>
          Promise.resolve({ id: POST_ID, type: "story" } as const),
        loadPost: () => Promise.resolve(livePost),
      },
    );

    expect(target).toEqual({ kind: "post", post: livePost });
  });

  test("keeps stale data when every live provider fails", async () => {
    const stalePost = createPost(35);
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
        loadItem: () => Promise.reject(new Error("offline")),
        loadPost: () => Promise.reject(new Error("offline")),
      },
    );

    expect(target).toEqual({ kind: "post", post: stalePost });
  });

  test("does not replace stale data with a smaller live tree", async () => {
    const stalePost = createPost(35);
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
        loadItem: () =>
          Promise.resolve({ id: POST_ID, type: "story" } as const),
        loadPost: () => Promise.resolve(createPost(34)),
      },
    );

    expect(target).toEqual({ kind: "post", post: stalePost });
  });

  test("rejects a live tree for a different root", async () => {
    const stalePost = createPost(35);
    const livePost = { ...createPost(62), id: POST_ID + 1 };
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
        loadItem: () =>
          Promise.resolve({
            descendants: 62,
            id: POST_ID,
            type: "story",
          }),
        loadPost: () => Promise.resolve(livePost),
      },
    );

    expect(target).toEqual({ kind: "post", post: stalePost });
  });

  test("rejects a live tree below the official descendant watermark", async () => {
    const stalePost = createPost(35);
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
        loadItem: () =>
          Promise.resolve({
            descendants: 63,
            id: POST_ID,
            type: "story",
          }),
        loadPost: () => Promise.resolve(createPost(62)),
      },
    );

    expect(target).toEqual({ kind: "post", post: stalePost });
  });
});
