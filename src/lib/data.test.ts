import { describe, expect, spyOn, test } from "bun:test";
import type { HackerNewsItemReference } from "~/lib/item";
import type { Post } from "~/lib/post";
import { SubrequestBudgetError } from "./hacker-news/budget";
import { PostUnavailableError } from "./hacker-news/post-loader";
import { DataUnavailableError, getPostTarget } from "./data";

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
  test("loads posts without an item preflight", async () => {
    let itemReads = 0;
    let postReads = 0;
    const target = await getPostTarget(POST_ID, {
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
    });

    expect(target).toEqual({ kind: "post", post: POST });
    expect(itemReads).toBe(0);
    expect(postReads).toBe(1);
  });

  test("logs the post source and durations", async () => {
    const logs: string[] = [];
    const info = spyOn(console, "info").mockImplementation((message) => {
      logs.push(String(message));
    });

    try {
      await getPostTarget(POST_ID, {
        loadItem: () =>
          Promise.resolve({ id: POST_ID, type: "story" } as const),
        loadPost: () => Promise.resolve(createPost(35)),
      });
    } finally {
      info.mockRestore();
    }

    const entry = logs
      .map((message) => JSON.parse(message) as Record<string, unknown>)
      .find(({ event }) => event === "hn.post_load");
    expect(entry).toMatchObject({
      commentsCount: 35,
      event: "hn.post_load",
      postId: POST_ID,
      source: "providers",
    });
    expect(entry?.providerDurationMs).toEqual(expect.any(Number));
  });

  test("converts provider exhaustion into a route-level outage", async () => {
    const result = getPostTarget(POST_ID, {
      loadItem: () => Promise.resolve({ id: POST_ID, type: "story" }),
      loadPost: () =>
        Promise.reject(new PostUnavailableError("providers unavailable")),
    });

    expect(result).rejects.toBeInstanceOf(DataUnavailableError);
    await result.catch(() => undefined);
  });

  test("converts parent lookup failures into a route-level outage", async () => {
    const commentId = POST_ID + 2;
    const parentId = POST_ID + 1;
    const result = getPostTarget(commentId, {
      loadItem: (itemId) => {
        if (itemId === commentId) {
          return Promise.resolve({
            id: commentId,
            parent: parentId,
            type: "comment",
          });
        }

        return Promise.reject(new SubrequestBudgetError());
      },
      loadPost: () => Promise.resolve(null),
    });

    expect(result).rejects.toBeInstanceOf(DataUnavailableError);
    await result.catch(() => undefined);
  });
});
