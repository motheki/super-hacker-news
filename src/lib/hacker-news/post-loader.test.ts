import { describe, expect, test } from "bun:test";
import type { Post } from "~/lib/post";
import type { OfficialItem } from "./codec";
import { loadPost, type PostSelectionMetric } from "./post-loader";

const POST_ID = 1;
const STORY_TIME = 1_700_000_000;

function createPost(commentsCount: number): Post {
  return {
    id: POST_ID,
    title: "Story",
    points: 10,
    user: "alice",
    time: STORY_TIME,
    time_ago: "2 minutes ago",
    comments: Array.from({ length: commentsCount }, (_, index) => ({
      id: index + 2,
      comments: [],
      comments_count: 0,
    })),
    comments_count: commentsCount,
  };
}

const createRoot = (descendants: number): OfficialItem => ({
  descendants,
  id: POST_ID,
  type: "story",
});

describe("loadPost", () => {
  test("uses the aggregate at exact parity", async () => {
    const aggregate = createPost(3);
    let officialLoads = 0;

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(aggregate),
      getOfficialPost: () => {
        officialLoads += 1;
        return Promise.resolve(createPost(3));
      },
      getOfficialRoot: () => Promise.resolve(createRoot(3)),
      report: () => undefined,
    });

    expect(post).toBe(aggregate);
    expect(officialLoads).toBe(0);
  });

  test("uses the aggregate when it is ahead of the official count", async () => {
    const aggregate = createPost(4);
    let officialLoads = 0;
    const metrics: PostSelectionMetric[] = [];

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(aggregate),
      getOfficialPost: () => {
        officialLoads += 1;
        return Promise.resolve(createPost(3));
      },
      getOfficialRoot: () => Promise.resolve(createRoot(3)),
      report: (metric) => metrics.push(metric),
    });

    expect(post).toBe(aggregate);
    expect(officialLoads).toBe(0);
    expect(metrics[0]?.reason).toBe("aggregate-ahead");
  });

  test("uses the official tree for every mismatch", async () => {
    const official = createPost(3);
    let officialLoads = 0;

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(createPost(0)),
      getOfficialPost: () => {
        officialLoads += 1;
        return Promise.resolve(official);
      },
      getOfficialRoot: () => Promise.resolve(createRoot(3)),
      report: () => undefined,
    });

    expect(post).toBe(official);
    expect(officialLoads).toBe(1);
  });

  test("accepts a complete reachable tree below descendants", async () => {
    const official = createPost(3);

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(createPost(3)),
      getOfficialPost: () => Promise.resolve(official),
      getOfficialRoot: () => Promise.resolve(createRoot(4)),
      report: () => undefined,
    });

    expect(post).toBe(official);
  });

  test("keeps a valid aggregate when verification is unavailable", async () => {
    const aggregate = createPost(3);
    const metrics: PostSelectionMetric[] = [];

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(aggregate),
      getOfficialPost: () => Promise.resolve(createPost(3)),
      getOfficialRoot: () => Promise.reject(new Error("offline")),
      report: (metric) => metrics.push(metric),
    });

    expect(post).toBe(aggregate);
    expect(metrics[0]).toMatchObject({
      officialCount: null,
      reason: "official-unavailable",
      selectedProvider: "hackerwebapp",
    });
  });

  test("does not return a known-incomplete aggregate", async () => {
    const metrics: PostSelectionMetric[] = [];

    const result = loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(createPost(0)),
      getOfficialPost: () => Promise.reject(new Error("incomplete")),
      getOfficialRoot: () => Promise.resolve(createRoot(3)),
      report: (metric) => metrics.push(metric),
    });

    expect(result).rejects.toThrow("incomplete");
    await result.catch(() => undefined);

    expect(metrics[0]).toMatchObject({
      reason: "official-incomplete",
      selectedProvider: "none",
    });
  });
});
