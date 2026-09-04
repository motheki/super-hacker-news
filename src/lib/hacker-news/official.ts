import type { Post } from "~/lib/post";
import type { TopicItem } from "~/lib/topic";
import type { User } from "~/lib/user";
import { fetchJson } from "./client";
import {
  parseNumberArray,
  parseOfficialItem,
  parseOfficialUser,
  toOfficialPost,
  toOfficialTopic,
  toOfficialUser,
  type OfficialItem,
} from "./codec";
import type { ContentProvider } from "./provider";
import type { RequestBudget } from "./budget";
import { loadDescendants } from "./tree";

const OFFICIAL_API = "https://hacker-news.firebaseio.com/v0";
const ITEMS_PER_PAGE = 30;
const ITEM_BATCH_SIZE = 30;
const FEED_CACHE_SECONDS = 30;
const ITEM_CACHE_SECONDS = 15;
const USER_CACHE_SECONDS = 3_600;

const FEED_NAMES: Readonly<Record<string, string>> = {
  ask: "askstories",
  newest: "newstories",
  news: "topstories",
  show: "showstories",
};

function nowSeconds() {
  return Math.floor(Date.now() / 1_000);
}

async function getOfficialItem(itemId: number, budget: RequestBudget) {
  return fetchJson(`${OFFICIAL_API}/item/${itemId}.json`, parseOfficialItem, {
    cacheTtlSeconds: ITEM_CACHE_SECONDS,
    budget,
    operation: "item",
    provider: "official",
  });
}

async function getOfficialFeedIds(topic: string, budget: RequestBudget) {
  const feed = FEED_NAMES[topic];
  if (feed === undefined) return null;

  return fetchJson(`${OFFICIAL_API}/${feed}.json`, parseNumberArray, {
    cacheTtlSeconds: FEED_CACHE_SECONDS,
    budget,
    operation: "feed-ids",
    provider: "official",
  });
}

async function getOfficialItems(ids: readonly number[], budget: RequestBudget) {
  const items: OfficialItem[] = [];

  for (let start = 0; start < ids.length; start += ITEM_BATCH_SIZE) {
    const batch = ids.slice(start, start + ITEM_BATCH_SIZE);
    const loaded = await Promise.all(
      batch.map((itemId) => getOfficialItem(itemId, budget)),
    );

    for (const item of loaded) {
      if (item !== null) items.push(item);
    }
  }

  return items;
}

async function getTopics(
  topic: string,
  page: number,
  budget: RequestBudget,
): Promise<TopicItem[] | null> {
  const ids = await getOfficialFeedIds(topic, budget);
  if (ids === null) return null;

  const start = ITEMS_PER_PAGE * (page - 1);
  const pageIds = ids.slice(start, start + ITEMS_PER_PAGE);
  const items = await getOfficialItems(pageIds, budget);
  const now = nowSeconds();

  const topics: TopicItem[] = [];
  for (const item of items) {
    const topicItem = toOfficialTopic(item, now);
    if (topicItem !== null) topics.push(topicItem);
  }

  return topics;
}

export async function getOfficialPost(
  root: OfficialItem,
  budget: RequestBudget,
): Promise<Post | null> {
  const result = await loadDescendants(
    root,
    (itemId) => getOfficialItem(itemId, budget),
    ITEM_BATCH_SIZE,
  );

  // Every reachable child must load; HN can count unreachable killed comments.
  if (result.missingIds.length > 0) {
    throw new Error("Official comment tree is incomplete");
  }

  return toOfficialPost(root, result.items, nowSeconds());
}

export function getOfficialPostRoot(postId: number, budget: RequestBudget) {
  return getOfficialItem(postId, budget);
}

export function getOfficialPostSummary(root: OfficialItem) {
  return toOfficialPost(root, new Map(), nowSeconds());
}

async function getPost(
  postId: number,
  budget: RequestBudget,
): Promise<Post | null> {
  const root = await getOfficialPostRoot(postId, budget);
  if (root === null) return null;

  return getOfficialPost(root, budget);
}

async function getUser(
  userName: string,
  budget: RequestBudget,
): Promise<User | null> {
  const user = await fetchJson(
    `${OFFICIAL_API}/user/${encodeURIComponent(userName)}.json`,
    parseOfficialUser,
    {
      cacheTtlSeconds: USER_CACHE_SECONDS,
      budget,
      operation: "user",
      provider: "official",
    },
  );

  return user === null ? null : toOfficialUser(user, nowSeconds());
}

export async function getOfficialItemReference(
  itemId: number,
  budget: RequestBudget,
): Promise<OfficialItem | null> {
  const item = await getOfficialItem(itemId, budget);
  return item;
}

export function getOfficialBestStoryIds(budget: RequestBudget) {
  return fetchJson(`${OFFICIAL_API}/beststories.json`, parseNumberArray, {
    cacheTtlSeconds: FEED_CACHE_SECONDS,
    budget,
    operation: "best-story-ids",
    provider: "official",
  });
}

export const officialProvider = {
  getPost,
  getTopics,
  getUser,
} satisfies ContentProvider;
