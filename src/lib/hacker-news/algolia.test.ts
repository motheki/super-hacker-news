import { describe, expect, test } from "bun:test";
import { parseAlgoliaPost } from "./algolia";

describe("parseAlgoliaPost", () => {
  test("validates and counts a nested discussion", () => {
    const post = parseAlgoliaPost({
      author: "alice",
      children: [
        {
          author: "bob",
          children: [
            {
              author: null,
              children: [],
              created_at_i: 1_700_000_002,
              id: 3,
              text: null,
              type: "comment",
            },
          ],
          created_at_i: 1_700_000_001,
          id: 2,
          text: "Hello",
          type: "comment",
        },
      ],
      created_at_i: 1_700_000_000,
      id: 1,
      points: 10,
      text: null,
      title: "Story",
      type: "story",
      url: "https://example.com/story",
    });

    expect(post).toMatchObject({
      comments_count: 2,
      domain: "example.com",
      title: "Story",
    });
    expect(post?.comments[0]).toMatchObject({
      comments_count: 1,
      content: "Hello",
      user: "bob",
    });
  });
});
