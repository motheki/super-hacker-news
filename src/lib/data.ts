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

export const getPost = (postId: number) => fetchPost(postId);

export function getRootItemId(itemId: number) {
  return resolveRootItemId(itemId, fetchItemReference);
}

export const getUser = (userName: string) => fetchUser(userName);

export const getBestStoryIds = () => fetchBestStoryIds();
