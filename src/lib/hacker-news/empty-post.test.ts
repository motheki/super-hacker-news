import { describe, expect, test } from "bun:test";
import type { Post } from "~/lib/post";
import type { OfficialItem } from "./codec";
import { loadPost, PostUnavailableError, type PostSelectionMetric } from "./post-loader";

const empty: Post = {
  id: 1, title: "Story", user: "alice", points: 10,
  time: 1_700_000_000, time_ago: "2 minutes ago", comments: [], comments_count: 0,
};
const populated: Post = {
  ...empty, comments: [{ id: 2, comments: [] }], comments_count: 1,
};
const root: OfficialItem = { id: 1, type: "story", descendants: 1, kids: [2] };

function loaders(overrides: Partial<Parameters<typeof loadPost>[1]> = {}) {
  return {
    getAggregated: () => Promise.resolve(empty),
    getOfficialRoot: () => Promise.resolve(root),
    getSecondary: () => Promise.resolve(populated),
    getOfficialPost: () => Promise.resolve(populated),
    report: () => undefined,
    ...overrides,
  };
}

describe("empty bulk comment trees", () => {
  test("uses the secondary when the primary is empty despite official comments", async () => {
    const metrics: PostSelectionMetric[] = [];
    expect(await loadPost(1, loaders({ report: (metric) => metrics.push(metric) }))).toBe(populated);
    expect(metrics[0]).toMatchObject({ aggregatedCount: 0, officialCount: 1, reason: "secondary" });
  });

  test("a genuine empty post does not start secondary or tree requests", async () => {
    const metrics: PostSelectionMetric[] = [];
    expect(await loadPost(1, loaders({
      getOfficialRoot: () => Promise.resolve({ ...root, descendants: 0, kids: [] }),
      getSecondary: () => { throw new Error("must not load secondary"); },
      getOfficialPost: () => { throw new Error("must not hydrate"); },
      report: (metric) => metrics.push(metric),
    }))).toBe(empty);
    expect(metrics[0]?.reason).toBe("verified-empty");
  });

  test("kids disprove an empty tree even when descendants is zero", async () => {
    expect(await loadPost(1, loaders({
      getOfficialRoot: () => Promise.resolve({ ...root, descendants: 0 }),
    }))).toBe(populated);
  });

  test("verifies empty job posts without a descendants field", async () => {
    expect(await loadPost(1, loaders({
      getOfficialRoot: () => Promise.resolve({ id: 1, type: "job" }),
    }))).toBe(empty);
  });

  test("reconstructs officially when both bulk APIs return empty trees", async () => {
    expect(await loadPost(1, loaders({ getSecondary: () => Promise.resolve(empty) }))).toBe(populated);
  });

  test("an empty secondary also needs verification after a primary miss", async () => {
    expect(await loadPost(1, loaders({
      getAggregated: () => Promise.resolve(null),
      getSecondary: () => Promise.resolve(empty),
    }))).toBe(populated);
  });

  test("accepts an officially verified empty secondary", async () => {
    expect(await loadPost(1, loaders({
      getAggregated: () => Promise.resolve(null),
      getOfficialRoot: () => Promise.resolve({ ...root, descendants: 0, kids: [] }),
      getSecondary: () => Promise.resolve(empty),
    }))).toBe(empty);
  });

  test("keeps populated secondary data if official verification is down", async () => {
    expect(await loadPost(1, loaders({
      getOfficialRoot: () => Promise.reject(new Error("offline")),
    }))).toBe(populated);
  });

  for (const missingRoot of [false, true]) {
    test(`does not cache an empty tree when official lookup ${missingRoot ? "misses" : "fails"}`, async () => {
      const metrics: PostSelectionMetric[] = [];
      await expect(loadPost(1, loaders({
        getOfficialRoot: () => missingRoot ? Promise.resolve(null) : Promise.reject(new Error("offline")),
        getSecondary: () => Promise.resolve(empty),
        report: (metric) => metrics.push(metric),
      }))).rejects.toBeInstanceOf(PostUnavailableError);
      expect(metrics[0]?.reason).toBe("empty-unverified");
    });
  }

  test("does not fall back to an empty bulk tree when official reconstruction fails", async () => {
    await expect(loadPost(1, loaders({
      getSecondary: () => Promise.resolve(empty),
      getOfficialPost: () => Promise.reject(new Error("incomplete")),
    }))).rejects.toBeInstanceOf(PostUnavailableError);
  });
});
