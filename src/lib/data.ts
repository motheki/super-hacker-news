import {
  fetchBestStoryIds,
  fetchCompletePost,
  fetchItemReference,
  fetchTopicItems,
  fetchUser,
} from "~/lib/hacker-news";
import { HnDataClient, type ServiceBinding } from "~/lib/hacker-news/service";
import { resolvePostTarget } from "~/lib/post-target";

interface PostFallback {
  readonly loadItem: typeof fetchItemReference;
  readonly loadPost: typeof fetchCompletePost;
}

const POST_FALLBACK: PostFallback = {
  loadItem: fetchItemReference,
  loadPost: fetchCompletePost,
};

function getClient(binding?: ServiceBinding) {
  return binding === undefined ? null : new HnDataClient(binding);
}

export async function getTopicItems(
  topic: string,
  page: number,
  binding?: ServiceBinding,
) {
  const serviceItems = await getClient(binding)?.getTopics(topic, page);
  return serviceItems ?? fetchTopicItems(topic, page);
}

export async function getPostTarget(
  itemId: number,
  binding?: ServiceBinding,
  fallback: PostFallback = POST_FALLBACK,
) {
  const client = getClient(binding);
  const target = await client?.getTarget(itemId);
  if (target !== null && target !== undefined) return target;

  return resolvePostTarget(itemId, fallback.loadItem, fallback.loadPost);
}

export async function getUser(userName: string, binding?: ServiceBinding) {
  const serviceUser = await getClient(binding)?.getUser(userName);
  return serviceUser ?? fetchUser(userName);
}

export async function getBestStoryIds(binding?: ServiceBinding) {
  const serviceIds = await getClient(binding)?.getBestStoryIds();
  return serviceIds ?? fetchBestStoryIds();
}
