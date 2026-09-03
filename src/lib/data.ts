import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import {
  fetchBestStoryIds,
  fetchItemReference,
  fetchPost,
  fetchTopicItems,
  fetchUser,
} from "~/lib/hacker-news";
import { resolveRootItemId } from "~/lib/item";

export const getTopicItems = (topic: string, page: number) =>
  fetchTopicItems(topic, page);

export const getPost = cache(fetchPost);

async function loadRootItemId(itemId: number) {
  "use cache";
  cacheLife("root");
  cacheTag("roots", `root:${itemId}`);

  return resolveRootItemId(itemId, fetchItemReference);
}

export const getRootItemId = cache(loadRootItemId);

export const getUser = cache(fetchUser);

export const getBestStoryIds = () => fetchBestStoryIds();
