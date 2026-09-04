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
  test("returns the primary without official verification", async () => {
    const primary = createPost(3);
    let officialReads = 0;

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(primary),
      getSecondary: () => Promise.resolve(null),
      getOfficialPost: () => Promise.resolve(createPost(3)),
      getOfficialRoot: () => {
        officialReads += 1;
        return Promise.resolve(createRoot(3));
      },
      report: () => undefined,
    });

    expect(post).toBe(primary);
    expect(officialReads).toBe(0);
  });

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

  test("does not start fallbacks while the primary is pending", async () => {
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
      report: () => undefined,
    });

    await Bun.sleep(5);
    const loadsBeforePrimary = secondaryLoads;
    const primary = createPost(3);
    releaseAggregate(primary);

    expect(loadsBeforePrimary).toBe(0);
    expect(await result).toBe(primary);
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
    expect(metrics[0]?.reason).toBe("primary");
  });

  test("trusts the primary without an official mismatch check", async () => {
    const primary = createPost(0);
    let officialLoads = 0;

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(primary),
      getSecondary: () => Promise.resolve(null),
      getOfficialPost: () => {
        officialLoads += 1;
        return Promise.resolve(createPost(3));
      },
      getOfficialRoot: () => Promise.resolve(createRoot(3)),
      report: () => undefined,
    });

    expect(post).toBe(primary);
    expect(officialLoads).toBe(0);
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
      reason: "primary",
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

  test("hydrates a large official fallback without a comment budget", async () => {
    const official = createPost(187);
    const metrics: PostSelectionMetric[] = [];
    let officialLoads = 0;

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(null),
      getSecondary: () => Promise.resolve(null),
      getOfficialPost: () => {
        officialLoads += 1;
        return Promise.resolve(official);
      },
      getOfficialRoot: () => Promise.resolve(createRoot(187)),
      getOfficialSummary: () => createPost(0),
      report: (metric) => metrics.push(metric),
    });

    expect(post).toBe(official);
    expect(officialLoads).toBe(1);
    expect(metrics[0]).toMatchObject({
      reason: "official-fallback",
      selectedProvider: "official",
    });
  });

  test("uses a secondary bulk tree when the primary is unavailable", async () => {
    const secondary = createPost(3);

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(null),
      getOfficialPost: () => Promise.resolve(createPost(3)),
      getOfficialRoot: () => Promise.resolve(createRoot(3)),
      getSecondary: () => Promise.resolve(secondary),
      report: () => undefined,
    });

    expect(post).toBe(secondary);
  });

  test("stops fallbacks when the official item is a comment", async () => {
    let officialLoads = 0;
    let secondaryLoads = 0;

    const post = await loadPost(POST_ID, {
      getAggregated: () => Promise.resolve(null),
      getOfficialPost: () => {
        officialLoads += 1;
        return Promise.resolve(null);
      },
      getOfficialRoot: () =>
        Promise.resolve({ id: POST_ID, parent: 2, type: "comment" }),
      getOfficialSummary: () => null,
      getSecondary: () => {
        secondaryLoads += 1;
        return Promise.resolve(null);
      },
      report: () => undefined,
    });

    expect(post).toBeNull();
    expect(officialLoads).toBe(0);
    expect(secondaryLoads).toBe(0);
  });
});
