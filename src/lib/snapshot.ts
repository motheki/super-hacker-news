import { TOPICS, ITEMS_PER_PAGE, type TopicName } from "./topic";
import { parseOfficialItem, toOfficialTopic, type OfficialItem } from "./hacker-news/codec";
import { mapConcurrent, type HackerNewsClient } from "./hacker-news/official";

export const DEFAULT_SNAPSHOT_LIMIT = 100;
export function parseSnapshotLimit(value?: string) {
  if (value === undefined) return DEFAULT_SNAPSHOT_LIMIT;
  const limit = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(limit) || limit > 500) {
    throw new Error("HN_SNAPSHOT_LIMIT must be an integer from 1 to 500 (stories per feed)");
  }
  return limit;
}
export interface Snapshot {
  readonly builtAt: string;
  readonly limitPerFeed: number;
  readonly feeds: Record<TopicName, number[]>;
  readonly feedLengths: Record<TopicName, number>;
  readonly stories: OfficialItem[];
}
/** Fetch each story once for feeds, posts, sitemap and search. */
export async function buildSnapshot(client: HackerNewsClient, limit = DEFAULT_SNAPSHOT_LIMIT, now = Date.now()): Promise<Snapshot> {
  parseSnapshotLimit(String(limit));
  const lists = await Promise.all(TOPICS.map(({ name }) => client.getFeedIds(name)));
  const ids = [...new Set(lists.flatMap((feed) => feed.slice(0, limit)))];
  const loaded = await mapConcurrent(ids, (id) => client.getItem(id));
  const stories = loaded.filter((item): item is OfficialItem => item !== null && toOfficialTopic(item, now / 1000) !== null);
  if (!stories.length) throw new Error("Refusing to publish an empty Hacker News snapshot");
  return {
    builtAt: new Date(now).toISOString(), limitPerFeed: limit, stories,
    feeds: Object.fromEntries(TOPICS.map(({ name }, index) => [name, lists[index]!.slice(0, limit)])) as Snapshot["feeds"],
    feedLengths: Object.fromEntries(TOPICS.map(({ name }, index) => [name, lists[index]!.length])) as Snapshot["feedLengths"],
  };
}
/** A corrupt saved snapshot must never replace a deployment. */
export function parseSnapshot(value: unknown): Snapshot {
  const fail = (): never => { throw new Error("Invalid Hacker News snapshot"); };
  if (!value || typeof value !== "object") return fail();
  const snapshot = value as Snapshot;
  if (typeof snapshot.builtAt !== "string" || !Number.isFinite(Date.parse(snapshot.builtAt))) return fail();
  parseSnapshotLimit(String(snapshot.limitPerFeed));
  if (!Array.isArray(snapshot.stories) || !snapshot.stories.length || snapshot.stories.length > 4 * snapshot.limitPerFeed) return fail();
  if (!snapshot.stories.every((item) => parseOfficialItem(item) && toOfficialTopic(item, Date.parse(snapshot.builtAt) / 1000))) return fail();
  const ids = new Set(snapshot.stories.map(({ id }) => id));
  if (ids.size !== snapshot.stories.length || !snapshot.feeds || !snapshot.feedLengths) return fail();
  for (const { name } of TOPICS) {
    const feed = snapshot.feeds[name];
    if (!Number.isSafeInteger(snapshot.feedLengths[name]) || snapshot.feedLengths[name] < (feed?.length ?? 0) || snapshot.feedLengths[name] > 500) return fail();
    if (!Array.isArray(feed) || feed.length > snapshot.limitPerFeed || new Set(feed).size !== feed.length || !feed.every((id) => Number.isSafeInteger(id) && id > 0)) return fail();
  }
  return snapshot;
}
export function snapshotPages(snapshot: Snapshot) {
  const byId = new Map(snapshot.stories.map((item) => [item.id, item]));
  const now = Date.parse(snapshot.builtAt) / 1000;
  return TOPICS.flatMap((topic) => {
    const ids = snapshot.feeds[topic.name];
    const truncated = snapshot.feedLengths[topic.name] > ids.length;
    // Do not skip the unbuilt tail of a partial page when switching to live pagination.
    const pages = Math.max(1, truncated ? Math.floor(ids.length / ITEMS_PER_PAGE) : Math.ceil(ids.length / ITEMS_PER_PAGE));
    return Array.from({ length: pages }, (_, index) => ({
      params: { topicName: topic.name, page: index === 0 ? undefined : String(index + 1) },
      props: {
        topic, page: index + 1, builtAt: snapshot.builtAt, hasMore: index + 1 < pages,
        liveHasMore: truncated || (index + 1) * ITEMS_PER_PAGE < snapshot.feedLengths[topic.name],
        liveNextPage: ids.length < ITEMS_PER_PAGE && truncated ? 1 : index + 2,
        items: ids.slice(index * ITEMS_PER_PAGE, (index + 1) * ITEMS_PER_PAGE).flatMap((id) => { const item = byId.get(id); return item ? [toOfficialTopic(item, now)!] : []; }),
      },
    }));
  });
}
export function searchRanges(time: number, builtAt: string) {
  const age = Math.max(0, Date.parse(builtAt) / 1000 - time);
  return ([['day', 86400], ['week', 604800], ['month', 2592000], ['year', 31536000]] as const)
    .filter(([, seconds]) => age <= seconds).map(([range]) => range);
}
