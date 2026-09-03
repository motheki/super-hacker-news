import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { aggregatedProvider } from "./aggregated";
import { preferPrimary } from "./client";
import { isPostComplete } from "./codec";
import {
  getOfficialBestStoryIds,
  getOfficialCommentCount,
  getOfficialItemReference,
  officialProvider,
} from "./official";

async function getPrimaryPost(postId: number) {
  const countPromise = getOfficialCommentCount(postId).catch(() => null);
  const [post, officialCount] = await Promise.all([
    aggregatedProvider.getPost(postId),
    countPromise,
  ]);

  if (post === null || !isPostComplete(post, officialCount)) return null;
  return post;
}

export async function fetchTopicItems(topic: string, page: number) {
  "use cache";
  cacheLife("feed");
  cacheTag("topics", `topic:${topic}:${page}`);

  return preferPrimary(
    "feed",
    () => aggregatedProvider.getTopics(topic, page),
    () => officialProvider.getTopics(topic, page),
  );
}

export async function fetchPost(postId: number) {
  "use cache";
  cacheLife("post");
  cacheTag("posts", `post:${postId}`);

  return preferPrimary(
    "post",
    () => getPrimaryPost(postId),
    () => officialProvider.getPost(postId),
  );
}

export async function fetchItemReference(itemId: number) {
  "use cache";
  cacheLife("item");
  cacheTag("items", `item:${itemId}`);

  return getOfficialItemReference(itemId);
}

export async function fetchUser(userName: string) {
  "use cache";
  cacheLife("user");
  cacheTag("users", `user:${userName}`);

  return preferPrimary(
    "user",
    () => aggregatedProvider.getUser(userName),
    () => officialProvider.getUser(userName),
  );
}

export async function fetchBestStoryIds() {
  "use cache";
  cacheLife("storyIds");
  cacheTag("stories", "stories:best");

  return getOfficialBestStoryIds();
}
