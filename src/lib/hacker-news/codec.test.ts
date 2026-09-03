import { describe, expect, test } from "bun:test";
import { isPostComplete, parseAggregatedPost, toOfficialPost } from "./codec";

const STORY_TIME = 1_700_000_000;
const NOW = STORY_TIME + 120;

describe("post codecs", () => {
  test("rejects an aggregated tree missing official comments", () => {
    const post = parseAggregatedPost({
      id: 1,
      title: "Story",
      points: 10,
      user: "alice",
      time: STORY_TIME,
      time_ago: "2 minutes ago",
      comments_count: 0,
      comments: [],
    });

    expect(post).not.toBeNull();
    expect(post === null ? true : isPostComplete(post, 71)).toBeFalse();
  });

  test("accepts normal aggregator lag", () => {
    const post = parseAggregatedPost({
      id: 1,
      title: "Story",
      points: 10,
      user: "alice",
      time: STORY_TIME,
      time_ago: "2 minutes ago",
      comments_count: 31,
      comments: Array.from({ length: 31 }, (_, index) => ({
        id: index + 2,
        comments: [],
      })),
    });

    expect(post).not.toBeNull();
    expect(post === null ? false : isPostComplete(post, 33)).toBeTrue();
  });

  test("validates and counts aggregated comments in one pass", () => {
    const post = parseAggregatedPost({
      id: 1,
      title: "Story",
      points: 10,
      user: "alice",
      time: STORY_TIME,
      time_ago: "2 minutes ago",
      comments_count: 999,
      comments: [
        {
          id: 2,
          user: "bob",
          comments_count: 999,
          comments: [{ id: 3, comments: [] }],
        },
      ],
    });

    expect(post?.comments_count).toBe(2);
    expect(post?.comments[0]?.comments_count).toBe(1);
  });

  test("builds the same domain model from official items", () => {
    const post = toOfficialPost(
      {
        by: "alice",
        descendants: 1,
        id: 1,
        kids: [2],
        score: 10,
        time: STORY_TIME,
        title: "Story",
        type: "story",
        url: "https://www.example.com/story",
      },
      new Map([
        [
          2,
          {
            by: "bob",
            id: 2,
            parent: 1,
            text: "Hello",
            time: STORY_TIME,
            type: "comment",
          },
        ],
      ]),
      NOW,
    );

    expect(post).toMatchObject({
      comments_count: 1,
      domain: "example.com",
      points: 10,
      time_ago: "2 minutes ago",
      user: "alice",
    });
    expect(post?.comments[0]).toMatchObject({
      comments_count: 0,
      content: "Hello",
      user: "bob",
    });
  });
});
