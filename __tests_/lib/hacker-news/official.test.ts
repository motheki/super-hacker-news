import { expect, test } from "bun:test";
import { createHackerNewsClient, mapConcurrent } from "../../../src/lib/hacker-news/official";
import { fixtureClient, STORY } from "../../fixtures/hacker-news";

test("deduplicates item requests within a request, including concurrent lookups", async () => {
  const { client, paths } = fixtureClient({ "item/1": STORY });
  const loaded = await Promise.all([client.getItem(1), client.getItem(1), client.getItem(1)]);
  expect(loaded[0]).toEqual(STORY);
  expect(paths).toEqual(["item/1"]);
});
test("the worker pool caps active work and preserves input ordering", async () => {
  let active = 0, maximum = 0;
  const result = await mapConcurrent([4, 3, 2, 1, 0], async (value) => {
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, value));
    active--;
    return value * 2;
  }, 2);
  expect(maximum).toBe(2);
  expect(result).toEqual([8, 6, 4, 2, 0]);
});
test("feeds preserve HN rank, skip unavailable items and know the actual final page", async () => {
  const { client, paths } = fixtureClient({
    topstories: [4, 1, 3, 2],
    "item/1": STORY,
    "item/4": { ...STORY, id: 4, deleted: true },
    "item/2": { ...STORY, id: 2 },
  });
  const feed = await client.getFeed("top", 1);
  expect(feed?.items.map(({ id }) => id)).toEqual([1, 2]);
  expect(feed?.hasMore).toBe(false);
  expect(await client.getFeed("top", 2)).toBeNull();
  expect(paths.filter((path) => path.startsWith("item/"))).toHaveLength(4);
});
test("supports all 500 official feed IDs, including the short seventeenth page", async () => {
  const data: Record<string, unknown> = { newstories: Array.from({ length: 500 }, (_, i) => i + 1) };
  for (let id = 481; id <= 500; id++) data[`item/${id}`] = { ...STORY, id };
  const { client } = fixtureClient(data);
  const page = await client.getFeed("new", 17);
  expect(page?.items).toHaveLength(20);
  expect(page?.hasMore).toBe(false);
  expect(await client.getFeed("new", 18)).toBeNull();
});
test("comment pagination never downloads grandchildren and loads only the requested direct children", async () => {
  const children = Array.from({ length: 45 }, (_, i) => i + 2);
  const data: Record<string, unknown> = { "item/1": { ...STORY, kids: children } };
  for (const id of children) data[`item/${id}`] = { id, type: "comment", parent: 1, kids: [9999] };
  const { client, paths, budget } = fixtureClient(data);
  const root = await client.getItem(1);
  const page = await client.getComments(root!, 2);
  expect(page?.comments.map(({ id }) => id)).toEqual(children.slice(20, 40));
  expect(page?.nextPage).toBe(3);
  expect(budget.snapshot().requestsUsed).toBe(21);
  expect(paths).not.toContain("item/9999");
  expect(await client.getComments(root!, 4)).toBeNull();
});
test("deleted parents retain reachable replies; malformed parent relationships are excluded", async () => {
  const { client } = fixtureClient({
    "item/2": { id: 2, type: "comment", parent: 1 },
    "item/3": { id: 3, type: "comment", parent: 999 },
  });
  const page = await client.getComments({ id: 1, type: "comment", deleted: true, kids: [1, 2, 2, 3] });
  expect(page?.comments.map(({ id }) => id)).toEqual([2]);
});
test("each comment request can retry once within the application request budget", async () => {
  const attempts = new Map<string, number>();
  const client = createHackerNewsClient({ report: () => {}, sleep: async () => {}, fetcher: async (input) => {
    const path = String(input);
    const count = (attempts.get(path) ?? 0) + 1;
    attempts.set(path, count);
    if (count === 1) return new Response(null, { status: 503 });
    const id = Number(path.match(/item\/(\d+)/)?.[1]);
    return Response.json({ id, type: "comment", parent: 1 });
  }});
  const result = await client.getComments({ ...STORY, kids: Array.from({ length: 20 }, (_, i) => i + 2) });
  expect(result?.comments).toHaveLength(20);
  expect([...attempts.values()].reduce((a, b) => a + b, 0)).toBe(40);
});
test("mismatched item IDs are outages, not different stories", async () => {
  const { client } = fixtureClient({ "item/1": { ...STORY, id: 2 } });
  await expect(client.getItem(1)).rejects.toThrow("ID mismatch");
});

test("a failed pool drains in-flight work without fetching the rest of the feed", async () => {
  const read: number[] = [];
  await expect(mapConcurrent([1, 2, 3, 4], async (id) => {
    read.push(id);
    if (id === 1) throw new Error("offline");
    await new Promise((resolve) => setTimeout(resolve, 5));
    return id;
  }, 2)).rejects.toThrow("offline");
  expect(read).toEqual([1, 2]);
});
