import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { HackerNewsItemReference } from "./item";
import type { Post } from "./post";
import type { TopicItem } from "./topic";
import type { User } from "./user";

type Validator<T> = (value: unknown) => value is T;

const CACHE_NEWS = "news";
const CACHE_STORY_IDS = "storyIds";
const HTTP_NOT_FOUND = 404;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isOptionalString = (value: unknown) =>
  value === undefined || typeof value === "string";
const isOptionalNumber = (value: unknown) =>
  value === undefined || typeof value === "number";
const isOptionalBoolean = (value: unknown) =>
  value === undefined || typeof value === "boolean";
const isNullableString = (value: unknown) =>
  value === undefined || value === null || typeof value === "string";
const isNullableNumber = (value: unknown) =>
  value === undefined || value === null || typeof value === "number";

const hasCommentShape = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.id === "number" &&
  isOptionalString(value.user) &&
  isOptionalNumber(value.time) &&
  isOptionalString(value.time_ago) &&
  isOptionalString(value.content) &&
  isOptionalBoolean(value.deleted) &&
  isOptionalBoolean(value.dead) &&
  isOptionalNumber(value.comments_count) &&
  isOptionalString(value.url) &&
  Array.isArray(value.comments) &&
  value.comments.every(hasCommentShape);

const isTopicItems: Validator<TopicItem[]> = (value): value is TopicItem[] =>
  Array.isArray(value) &&
  value.every(
    (item) =>
      isRecord(item) &&
      typeof item.id === "number" &&
      typeof item.title === "string" &&
      isNullableNumber(item.points) &&
      isNullableString(item.user) &&
      typeof item.time === "number" &&
      typeof item.time_ago === "string" &&
      typeof item.comments_count === "number" &&
      typeof item.type === "string" &&
      isOptionalString(item.url) &&
      isOptionalString(item.domain),
  );

const isPost: Validator<Post> = (value): value is Post =>
  isRecord(value) &&
  typeof value.id === "number" &&
  typeof value.title === "string" &&
  typeof value.points === "number" &&
  typeof value.user === "string" &&
  typeof value.time === "number" &&
  typeof value.time_ago === "string" &&
  isOptionalString(value.content) &&
  isOptionalString(value.url) &&
  isOptionalString(value.domain) &&
  typeof value.comments_count === "number" &&
  Array.isArray(value.comments) &&
  value.comments.every(hasCommentShape);

const isUser: Validator<User> = (value): value is User =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.karma === "number" &&
  typeof value.created_time === "number" &&
  typeof value.created === "string" &&
  isOptionalString(value.about);

const isNumberArray: Validator<number[]> = (value): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === "number");

const isItemReference: Validator<HackerNewsItemReference> = (
  value,
): value is HackerNewsItemReference =>
  isRecord(value) &&
  typeof value.id === "number" &&
  typeof value.type === "string" &&
  isOptionalNumber(value.parent);

async function fetchJson<T>(
  url: string,
  isValid: Validator<T>,
): Promise<T | null> {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });

  if (response.status === HTTP_NOT_FOUND) return null;
  if (!response.ok) {
    throw new Error(`Upstream request failed with status ${response.status}`);
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    return null;
  }

  return isValid(value) ? value : null;
}

export async function fetchTopicItems(topic: string, page: number) {
  "use cache";
  cacheLife(CACHE_NEWS);
  cacheTag("topics", `topic:${topic}:${page}`);
  const items = await fetchJson(
    `https://api.hackerwebapp.com/${topic}?page=${page}.json`,
    isTopicItems,
  );
  return items;
}

export async function fetchPost(postId: number) {
  "use cache";
  cacheLife(CACHE_NEWS);
  cacheTag("posts", `post:${postId}`);
  const post = await fetchJson(
    `https://api.hackerwebapp.com/item/${postId}`,
    isPost,
  );
  return post;
}

export async function fetchItemReference(itemId: number) {
  "use cache";
  cacheLife(CACHE_NEWS);
  cacheTag("items", `item:${itemId}`);
  const item = await fetchJson(
    `https://hacker-news.firebaseio.com/v0/item/${itemId}.json`,
    isItemReference,
  );
  return item;
}

export async function fetchUser(userName: string) {
  "use cache";
  cacheLife(CACHE_NEWS);
  cacheTag("users", `user:${userName}`);
  const user = await fetchJson(
    `https://api.hnpwa.com/v0/user/${encodeURIComponent(userName)}.json`,
    isUser,
  );
  return user;
}

export async function fetchBestStoryIds() {
  "use cache";
  cacheLife(CACHE_STORY_IDS);
  cacheTag("stories", "stories:best");
  const storyIds = await fetchJson(
    "https://hacker-news.firebaseio.com/v0/beststories.json",
    isNumberArray,
  );
  return storyIds;
}
