import { describe, expect, test } from "bun:test";
import type { Post } from "~/lib/post";
import type { OfficialItem } from "./codec";
import {
  loadCompletePost,
  loadPost,
  type PostSelectionMetric,
} from "./post-loader";

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
      getSecondary: () => Promise.resolve(null),
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

  test("does not wait for the secondary when the primary is complete", async () => {
    const aggregate = createPost(3);
    let secondaryLoads = 0;

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(aggregate),
      getSecondary: () => {
        secondaryLoads += 1;
        return Promise.resolve(createPost(4));
      },
      getOfficialPost: () => Promise.resolve(createPost(3)),
      getOfficialRoot: () => Promise.resolve(createRoot(3)),
      report: () => undefined,
    });

    expect(post).toBe(aggregate);
    expect(secondaryLoads).toBe(0);
  });

  test("hedges the secondary while primary verification is slow", async () => {
    let releaseAggregate: (post: Post) => void = () => undefined;
    const aggregate = new Promise<Post>((resolve) => {
      releaseAggregate = resolve;
    });
    let secondaryLoads = 0;

    const result = loadPost(POST_ID, {
      getAggregated: () => aggregate,
      getSecondary: () => {
        secondaryLoads += 1;
        return Promise.resolve(createPost(3));
      },
      getOfficialPost: () => Promise.resolve(createPost(3)),
      getOfficialRoot: () => Promise.resolve(createRoot(3)),
      hedgeDelayMs: 0,
      report: () => undefined,
    });

    await Bun.sleep(5);
    const loadsBeforePrimary = secondaryLoads;
    releaseAggregate(createPost(0));
    await result;

    expect(loadsBeforePrimary).toBe(1);
  });

  test("uses the aggregate when it is ahead of the official count", async () => {
    const aggregate = createPost(4);
    let officialLoads = 0;
    const metrics: PostSelectionMetric[] = [];

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(aggregate),
      getSecondary: () => Promise.resolve(null),
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
      getSecondary: () => Promise.resolve(null),
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
      getSecondary: () => Promise.resolve(null),
      getOfficialPost: () => Promise.resolve(official),
      getOfficialRoot: () => Promise.resolve(createRoot(4)),
      report: () => undefined,
    });

    expect(post?.comments_count).toBe(3);
  });

  test("keeps a valid aggregate when verification is unavailable", async () => {
    const aggregate = createPost(3);
    const metrics: PostSelectionMetric[] = [];

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(aggregate),
      getSecondary: () => Promise.resolve(null),
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

  test("throws when every post source fails", async () => {
    const metrics: PostSelectionMetric[] = [];

    const result = loadPost(POST_ID, {
      getAggregated: () => Promise.reject(new Error("primary unavailable")),
      getSecondary: () => Promise.resolve(null),
      getOfficialPost: () => Promise.reject(new Error("incomplete")),
      getOfficialRoot: () => Promise.resolve(createRoot(0)),
      report: (metric) => metrics.push(metric),
    });

    expect(result).rejects.toThrow("incomplete");
    await result.catch(() => undefined);

    expect(metrics[0]).toMatchObject({
      reason: "official-incomplete",
      selectedProvider: "none",
    });
  });

  test("keeps a valid aggregate when official hydration exceeds its budget", async () => {
    const aggregate = createPost(180);
    const metrics: PostSelectionMetric[] = [];
    let officialLoads = 0;

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(aggregate),
      getSecondary: () => Promise.resolve(null),
      getOfficialPost: () => {
        officialLoads += 1;
        return Promise.reject(
          new Error("Too many subrequests by single Worker invocation"),
        );
      },
      getOfficialRoot: () => Promise.resolve(createRoot(187)),
      report: (metric) => metrics.push(metric),
    });

    expect(post).toBe(aggregate);
    expect(officialLoads).toBe(0);
    expect(metrics[0]).toMatchObject({
      reason: "official-budget",
      selectedProvider: "hackerwebapp",
    });
  });

  test("uses a secondary bulk tree when the primary has no comments", async () => {
    const secondary = createPost(3);

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(createPost(0)),
      getOfficialPost: () => Promise.resolve(createPost(3)),
      getOfficialRoot: () => Promise.resolve(createRoot(3)),
      getSecondary: () => Promise.resolve(secondary),
      report: () => undefined,
    });

    expect(post).toBe(secondary);
  });
});

describe("loadCompletePost", () => {
  test("prefers the reachable official tree", async () => {
    const official = createPost(4);
    let fallbackLoads = 0;

    const post = await loadCompletePost({
      getFallback: () => {
        fallbackLoads += 1;
        return Promise.resolve(createPost(3));
      },
      getOfficial: () => Promise.resolve(official),
    });

    expect(post).toBe(official);
    expect(fallbackLoads).toBe(0);
  });

  test("keeps provider fallback when official hydration fails", async () => {
    const fallback = createPost(3);

    const post = await loadCompletePost({
      getFallback: () => Promise.resolve(fallback),
      getOfficial: () => Promise.reject(new Error("offline")),
    });

    expect(post).toBe(fallback);
  });
});
