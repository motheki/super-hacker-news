import { expect, test } from "bun:test";
import { buildSnapshot, parseSnapshot, parseSnapshotLimit, snapshotPages, searchRanges } from "../../src/lib/snapshot";
import { fixtureClient, STORY } from "../fixtures/hacker-news";
import { fixtureData } from "../fixtures/static-site";
const now = STORY.time! * 1000 + 1000;
test("one bounded snapshot deduplicates feeds, preserves ordering and never fetches comments", async () => {
  const { client, paths } = fixtureClient(fixtureData, 1000);
  const snapshot = await buildSnapshot(client, 100, now);
  expect(snapshot.stories).toHaveLength(36);
  expect(paths).toHaveLength(40);
  expect(paths.filter((path) => path === "item/1")).toHaveLength(1);
  expect(paths).not.toContain("item/2");
  expect(parseSnapshot(JSON.parse(JSON.stringify(snapshot)))).toEqual(snapshot);
  const pages = snapshotPages(snapshot).filter(({ params }) => params.topicName === "top");
  expect(pages.map(({ props }) => props.items.length)).toEqual([30, 6]);
  expect(pages[1]?.props).toMatchObject({ hasMore: false, liveHasMore: false });
});
test("a truncated snapshot hands off at a complete page boundary without skipping IDs", async () => {
  const snapshot = await buildSnapshot(fixtureClient(fixtureData, 1000).client, 31, now);
  const pages = snapshotPages(snapshot).filter(({ params }) => params.topicName === "top");
  expect(pages).toHaveLength(1);
  expect(pages[0]?.props).toMatchObject({ liveHasMore: true, liveNextPage: 2, hasMore: false });
  expect(snapshot.stories).toHaveLength(31);
});
test("missing or dead items do not shift pagination boundaries", async () => {
  const data = { ...fixtureData, "item/1": { ...STORY, deleted: true }, "item/105": null };
  const snapshot = await buildSnapshot(fixtureClient(data, 1000).client, 31, now);
  const page = snapshotPages(snapshot)[0]!;
  expect(page.props.items).toHaveLength(28);
  expect(page.props.liveNextPage).toBe(2);
  expect(snapshot.stories.some(({ id }) => id === 1)).toBe(false);
});
test("empty, malformed or unavailable snapshots fail instead of publishing missing content", async () => {
  const empty = fixtureClient({ topstories: [], newstories: [], askstories: [], showstories: [] });
  await expect(buildSnapshot(empty.client)).rejects.toThrow("empty");
  await expect(buildSnapshot(fixtureClient({}).client)).rejects.toThrow("unavailable");
  const snapshot = await buildSnapshot(fixtureClient(fixtureData, 1000).client, 100, now);
  for (const bad of [null, {}, { ...snapshot, builtAt: "invalid" }, { ...snapshot, stories: [] }, { ...snapshot, stories: [STORY, STORY] }, { ...snapshot, feedLengths: {} }]) expect(() => parseSnapshot(bad)).toThrow();
});
test("limits and search time ranges are relative to the shared snapshot", () => {
  expect(parseSnapshotLimit()).toBe(100);
  expect(parseSnapshotLimit("500")).toBe(500);
  for (const value of ["0", "501", "-1", "1.5", "1e2", "bad"]) expect(() => parseSnapshotLimit(value)).toThrow();
  expect(searchRanges(STORY.time!, new Date(now).toISOString())).toEqual(["day", "week", "month", "year"]);
});
