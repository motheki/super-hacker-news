import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { aggregatedProvider } from "./aggregated";
import { preferPrimary } from "./client";
import {
  getOfficialBestStoryIds,
  getOfficialItemReference,
  getOfficialPost,
  getOfficialPostRoot,
  officialProvider,
} from "./official";
import { loadPost, type PostSelectionMetric } from "./post-loader";

function reportPostSelection(metric: PostSelectionMetric) {
  console.info("hn.post_selection", metric);
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

  return loadPost(postId, {
    getAggregated: () => aggregatedProvider.getPost(postId),
    getOfficialPost,
    getOfficialRoot: () => getOfficialPostRoot(postId),
    report: reportPostSelection,
  });
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
