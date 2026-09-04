import { describe, expect, test } from "bun:test";
import type { Post } from "~/lib/post";
import { HnDataClient } from "./service";

const POST_ID = 8_863;
const COMMENT_ID = 8_864;
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

describe("HnDataClient", () => {
  test("reads a target with one bound service call", async () => {
    const paths: string[] = [];
    const client = new HnDataClient({
      fetch: (input) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.href
              : input.url;
        paths.push(url);
        return Promise.resolve(Response.json({ kind: "post", post: POST }));
      },
    });

    expect(await client.getTarget(POST_ID)).toEqual({
      stale: false,
      target: { kind: "post", post: POST },
    });
    expect(paths).toEqual([`https://hn-data.internal/target/${POST_ID}`]);
  });

  test("reads a comment redirect", async () => {
    const client = new HnDataClient({
      fetch: () =>
        Promise.resolve(Response.json({ kind: "redirect", rootId: POST_ID })),
    });

    expect(await client.getTarget(COMMENT_ID)).toEqual({
      stale: false,
      target: { kind: "redirect", rootId: POST_ID },
    });
  });

  test("reports a stale materialized target", async () => {
    const client = new HnDataClient({
      fetch: () =>
        Promise.resolve(
          Response.json(
            { kind: "post", post: POST },
            { headers: { "x-super-hn-stale": "1" } },
          ),
        ),
    });

    expect(await client.getTarget(POST_ID)).toEqual({
      stale: true,
      target: { kind: "post", post: POST },
    });
  });

  test("treats a warming service as a cache miss", async () => {
    const client = new HnDataClient({
      fetch: () => Promise.resolve(new Response(null, { status: 503 })),
    });

    expect(await client.getTarget(POST_ID)).toBeNull();
  });
});
