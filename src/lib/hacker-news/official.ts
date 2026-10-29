import type { CommentPage } from "../post";
import { TOPICS, ITEMS_PER_PAGE, MAX_FEED_PAGE, type TopicName } from "../topic";
import { RequestBudget } from "./budget";
import { fetchJson, type FetchJsonOptions, type JsonParser } from "./client";
import {
  parseNumberArray, parseOfficialItem, parseOfficialUser,
  toComment, toOfficialTopic, toOfficialUser, type OfficialItem,
} from "./codec";

export const OFFICIAL_API = "https://hacker-news.firebaseio.com/v0";
export const COMMENTS_PER_PAGE = 20;
const CONCURRENCY = 6;

/** A bounded worker pool preserves HN ranking without opening 30 connections. */
export async function mapConcurrent<T, R>(
  values: readonly T[], load: (value: T) => Promise<R>, concurrency = CONCURRENCY,
): Promise<R[]> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) throw new RangeError("Invalid concurrency");
  const results: R[] = new Array(values.length);
  let cursor = 0;
  let failed = false;
  const outcomes = await Promise.allSettled(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (!failed && cursor < values.length) {
      const index = cursor++;
      try {
        results[index] = await load(values[index]!);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }));
  const rejection = outcomes.find((outcome) => outcome.status === "rejected");
  if (rejection?.status === "rejected") throw rejection.reason;
  return results;
}

type ClientOptions = Pick<FetchJsonOptions, "fetcher" | "report" | "sleep" | "timeoutMs"> & {
  readonly budget?: RequestBudget;
};

/** Create once per request/build: deduplication never leaks stale items across requests. */
export function createHackerNewsClient(options: ClientOptions = {}) {
  const budget = options.budget ?? new RequestBudget();
  const items = new Map<number, Promise<OfficialItem | null>>();
  const request = <T>(path: string, parse: JsonParser<T>, operation: string) =>
    fetchJson(`${OFFICIAL_API}/${path}.json`, parse, {
      ...options, budget, operation, provider: "official",
    });

  const getItem = (id: number) => {
    if (!Number.isSafeInteger(id) || id <= 0) throw new RangeError("Invalid item ID");
    let pending = items.get(id);
    if (pending === undefined) {
      pending = request(`item/${id}`, parseOfficialItem, "item").then((item) => {
        if (item !== null && item.id !== id) throw new Error("Upstream item ID mismatch");
        return item;
      });
      items.set(id, pending);
    }
    return pending;
  };

  const getFeedIds = async (topic: TopicName | "best") => {
    const feed = topic === "best" ? "beststories" : TOPICS.find(({ name }) => name === topic)?.feed;
    if (feed === undefined) throw new RangeError("Invalid feed");
    const ids = await request(feed, parseNumberArray, "feed-ids");
    if (ids === null) throw new Error("Upstream feed is unavailable");
    return [...new Set(ids)];
  };

  return {
    getItem,
    getFeedIds,
    async getFeed(topic: TopicName, page: number) {
      if (!Number.isSafeInteger(page) || page < 1 || page > MAX_FEED_PAGE) return null;
      const ids = await getFeedIds(topic);
      const start = (page - 1) * ITEMS_PER_PAGE;
      if (start >= ids.length && page > 1) return null;
      const loaded = await mapConcurrent(ids.slice(start, start + ITEMS_PER_PAGE), getItem);
      const now = Math.floor(Date.now() / 1_000);
      return {
        items: loaded.flatMap((item) => {
          const topicItem = item === null ? null : toOfficialTopic(item, now);
          return topicItem === null ? [] : [topicItem];
        }),
        hasMore: start + ITEMS_PER_PAGE < ids.length && page < MAX_FEED_PAGE,
      };
    },
    async getComments(parent: OfficialItem, page = 1): Promise<CommentPage | null> {
      if (!Number.isSafeInteger(page) || page < 1) return null;
      const ids = [...new Set(parent.kids ?? [])].filter((id) => id !== parent.id);
      const start = (page - 1) * COMMENTS_PER_PAGE;
      if (start >= ids.length && page > 1) return null;
      const loaded = await mapConcurrent(ids.slice(start, start + COMMENTS_PER_PAGE), getItem);
      return {
        comments: loaded.flatMap((item) =>
          item !== null && item.type === "comment" && item.parent === parent.id
            ? [toComment(item, Math.floor(Date.now() / 1_000))] : []),
        nextPage: start + COMMENTS_PER_PAGE < ids.length ? page + 1 : null,
      };
    },
    async getUser(name: string) {
      const user = await request(`user/${encodeURIComponent(name)}`, parseOfficialUser, "user");
      if (user !== null && user.id !== name) throw new Error("Upstream user ID mismatch");
      return user === null ? null : toOfficialUser(user, Math.floor(Date.now() / 1_000));
    },
  };
}

export type HackerNewsClient = ReturnType<typeof createHackerNewsClient>;
