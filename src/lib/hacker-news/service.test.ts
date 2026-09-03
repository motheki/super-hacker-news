import { describe, expect, test } from "bun:test";
import { HnDataClient } from "./service";

const POST_ID = 8_863;

describe("HnDataClient", () => {
  test("reads a validated post from the bound service", async () => {
    const client = new HnDataClient({
      fetch: () =>
        Promise.resolve(
          Response.json({
            id: POST_ID,
            title: "Story",
            points: 10,
            user: "alice",
            time: 1_700_000_000,
            time_ago: "2 minutes ago",
            comments: [],
            comments_count: 0,
          }),
        ),
    });

    expect(await client.getPost(POST_ID)).toMatchObject({ id: POST_ID });
  });

  test("treats a warming service as a cache miss", async () => {
    const client = new HnDataClient({
      fetch: () => Promise.resolve(new Response(null, { status: 503 })),
    });

    expect(await client.getPost(POST_ID)).toBeNull();
  });
});
