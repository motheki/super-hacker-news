import { describe, expect, spyOn, test } from "bun:test";
import { rejects } from "node:assert/strict";
import { RequestBudget } from "./budget";
import { fetchPost } from "./index";
import { PostUnavailableError, type PostSelectionMetric } from "./post-loader";

const POST_ID = 1;
const STORY_TIME = 1_700_000_000;
const PRIMARY_URL = `https://api.hackerwebapp.com/item/${POST_ID}`;
const SECONDARY_URL = `https://hn.algolia.com/api/v1/items/${POST_ID}`;
const officialUrl = (id: number) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
const ROOT_URL = officialUrl(POST_ID);
const childIds = (count: number) => Array.from({ length: count }, (_, index) => index + 2);

function primaryPost(count: number) {
  return {
    id: POST_ID,
    title: "Primary story",
    user: "alice",
    points: 10,
    time: STORY_TIME,
    time_ago: "2 minutes ago",
    comments_count: count,
    comments: childIds(count).map((id) => ({ id, comments: [] })),
  };
}

function officialRoot(count: number) {
  return {
    id: POST_ID,
    type: "story",
    title: "Official story",
    by: "alice",
    time: STORY_TIME,
    descendants: count,
    kids: childIds(count),
  };
}

const json = (value: unknown) => () => Response.json(value);
const unavailable = () => new Response(null, { status: 503 });
type Routes = Map<string, () => Response>;

async function withUpstreams(
  routes: Routes,
  run: (requests: string[], selections: PostSelectionMetric[]) => Promise<void>,
) {
  const requests: string[] = [];
  const unexpected: string[] = [];
  const selections: PostSelectionMetric[] = [];
  // Never delegate to the original fetch, even for an unexpected URL.
  const fetcher = spyOn(globalThis, "fetch").mockImplementation(Object.assign(
    async (input: string | URL | Request) => {
      const url = input instanceof Request ? input.url : String(input);
      requests.push(url);
      const respond = routes.get(url);
      if (respond === undefined) {
        unexpected.push(url);
        throw new Error("Unexpected mocked upstream request");
      }
      return respond();
    },
    { preconnect: globalThis.fetch.preconnect },
  ));
  const info = spyOn(console, "info").mockImplementation((value) => {
    const metric = JSON.parse(String(value));
    if (metric.event === "hn.post_selection") selections.push(metric);
  });
  const warn = spyOn(console, "warn").mockImplementation(() => {});
  try {
    // These integration tests exercise the provider pipeline, not runtime Cache API behavior.
    expect(typeof caches).toBe("undefined");
    await run(requests, selections);
    expect(unexpected).toEqual([]);
  } finally {
    fetcher.mockRestore();
    info.mockRestore();
    warn.mockRestore();
  }
}

function expectRequests(actual: string[], expected: string[]) {
  // Comparing the full multiset catches both retries and accidental extra provider reads.
  expect([...actual].sort()).toEqual([...expected].sort());
}

describe("fetchPost provider integration", () => {
  test("recovers the 174-comment incident through Algolia after an empty primary", async () => {
    const ids = childIds(174);
    const budget = new RequestBudget();
    const routes: Routes = new Map([
      [PRIMARY_URL, json(primaryPost(0))],
      [ROOT_URL, json(officialRoot(174))],
      [SECONDARY_URL, json({
        id: POST_ID,
        title: "Algolia story",
        author: "alice",
        created_at_i: STORY_TIME,
        children: ids.map((id) => ({
          id, author: "bob", text: `Comment ${id}`, created_at_i: STORY_TIME, children: [],
        })),
      })],
    ]);

    await withUpstreams(routes, async (requests, selections) => {
      const post = await fetchPost(POST_ID, budget);
      expect(post).toMatchObject({ title: "Algolia story", comments_count: 174 });
      expect(post?.comments.map(({ id }) => id)).toEqual(ids);
      expect(requests).toEqual([PRIMARY_URL, ROOT_URL, SECONDARY_URL]);
      expect(budget.snapshot()).toEqual({ subrequestsUsed: 3, subrequestsRemaining: 997 });
      expect(selections).toHaveLength(1);
      expect(selections[0]).toMatchObject({
        aggregatedCount: 0, officialCount: 174, secondaryCount: 174,
        selectedProvider: "algolia", reason: "secondary",
        subrequestsUsed: 3, subrequestsRemaining: 997,
      });
    });
  });

  test("loads all 500 official descendants with the implicit default 1000 budget", async () => {
    const ids = childIds(500);
    const routes: Routes = new Map([
      [PRIMARY_URL, unavailable],
      [SECONDARY_URL, unavailable],
      [ROOT_URL, json(officialRoot(500))],
      ...ids.map((id): [string, () => Response] => [officialUrl(id), json({
        id, type: "comment", parent: POST_ID, by: "bob", time: STORY_TIME, text: `Comment ${id}`,
      })]),
    ]);

    await withUpstreams(routes, async (requests, selections) => {
      // Deliberately omit the budget: this must test fetchPost's production default.
      const post = await fetchPost(POST_ID);
      expect(post).toMatchObject({ title: "Official story", comments_count: 500 });
      expect(post?.comments.map(({ id }) => id)).toEqual(ids);
      expect(post?.comments.every((comment) => comment.content === `Comment ${comment.id}`)).toBe(true);
      expectRequests(requests, [PRIMARY_URL, SECONDARY_URL, ROOT_URL, ...ids.map(officialUrl)]);
      expect(requests).toHaveLength(503);
      expect(selections).toHaveLength(1);
      expect(selections[0]).toMatchObject({
        selectedProvider: "official", reason: "official-fallback", officialCount: 500,
        subrequestsUsed: 503, subrequestsRemaining: 497,
      });
    });
  });

  test.each([3, 50])("rejects a custom budget of %i without fetching a partial tree", async (limit) => {
    const budget = new RequestBudget(limit);
    const routes: Routes = new Map([
      [PRIMARY_URL, unavailable],
      [SECONDARY_URL, unavailable],
      [ROOT_URL, json(officialRoot(500))],
    ]);

    await withUpstreams(routes, async (requests, selections) => {
      await rejects(fetchPost(POST_ID, budget), PostUnavailableError);
      expectRequests(requests, [PRIMARY_URL, SECONDARY_URL, ROOT_URL]);
      expect(budget.snapshot()).toEqual({ subrequestsUsed: 3, subrequestsRemaining: limit - 3 });
      expect(selections).toHaveLength(1);
      expect(selections[0]).toMatchObject({ reason: "budget-exhausted", selectedProvider: "none" });
    });
  });

  test("returns a deleted official root as null without hydrating its descendants", async () => {
    const budget = new RequestBudget();
    const routes: Routes = new Map([
      [PRIMARY_URL, unavailable],
      [SECONDARY_URL, unavailable],
      [ROOT_URL, json({ id: POST_ID, type: "story", deleted: true, descendants: 500, kids: childIds(500) })],
    ]);

    await withUpstreams(routes, async (requests) => {
      expect(await fetchPost(POST_ID, budget)).toBeNull();
      expectRequests(requests, [PRIMARY_URL, SECONDARY_URL, ROOT_URL]);
      expect(budget.snapshot().subrequestsUsed).toBe(3);
    });
  });

  test("returns null when every provider reports a missing post", async () => {
    const budget = new RequestBudget();
    const routes: Routes = new Map([
      [PRIMARY_URL, json(null)],
      [SECONDARY_URL, json(null)],
      [ROOT_URL, json(null)],
    ]);

    await withUpstreams(routes, async (requests) => {
      expect(await fetchPost(POST_ID, budget)).toBeNull();
      expectRequests(requests, [PRIMARY_URL, SECONDARY_URL, ROOT_URL]);
      expect(budget.snapshot().subrequestsUsed).toBe(3);
    });
  });

  test("does not turn bulk outages plus a null official root into a missing post", async () => {
    const budget = new RequestBudget();
    const routes: Routes = new Map([
      [PRIMARY_URL, unavailable],
      [SECONDARY_URL, unavailable],
      [ROOT_URL, json(null)],
    ]);

    await withUpstreams(routes, async (requests) => {
      await rejects(fetchPost(POST_ID, budget), PostUnavailableError);
      expectRequests(requests, [PRIMARY_URL, SECONDARY_URL, ROOT_URL]);
      expect(budget.snapshot().subrequestsUsed).toBe(3);
    });
  });

  test("keeps the populated-primary fast path to one request", async () => {
    await withUpstreams(new Map([[PRIMARY_URL, json(primaryPost(1))]]), async (requests, selections) => {
      expect((await fetchPost(POST_ID))?.comments_count).toBe(1);
      expect(requests).toEqual([PRIMARY_URL]);
      expect(selections[0]).toMatchObject({
        selectedProvider: "hackerwebapp", subrequestsUsed: 1, subrequestsRemaining: 999,
      });
    });
  });

  test("skips Algolia when the official root confirms an empty primary", async () => {
    const routes: Routes = new Map([
      [PRIMARY_URL, json(primaryPost(0))],
      [ROOT_URL, json(officialRoot(0))],
    ]);
    await withUpstreams(routes, async (requests, selections) => {
      expect((await fetchPost(POST_ID))?.comments_count).toBe(0);
      expect(requests).toEqual([PRIMARY_URL, ROOT_URL]);
      expect(selections[0]).toMatchObject({
        reason: "verified-empty", subrequestsUsed: 2, subrequestsRemaining: 998,
      });
    });
  });
});
