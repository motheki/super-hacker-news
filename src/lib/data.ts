import {
  fetchBestStoryIds,
  fetchItemReference,
  fetchPost,
  fetchTopicItems,
  fetchUser,
} from "~/lib/hacker-news";
import { HnDataClient, type ServiceBinding } from "~/lib/hacker-news/service";
import { isRootItemType } from "~/lib/item";
import { resolvePostTarget } from "~/lib/post-target";

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

export async function getPostTarget(itemId: number, binding?: ServiceBinding) {
  const client = getClient(binding);
  const resolution = await client?.getResolution(itemId);
  if (resolution !== null && resolution !== undefined) {
    if (!isRootItemType(resolution.item.type)) {
      return { kind: "redirect", rootId: resolution.rootId } as const;
    }

    const post = await client?.getPost(resolution.rootId);
    if (post !== null && post !== undefined) {
      return { kind: "post", post } as const;
    }
  }

  return resolvePostTarget(itemId, fetchItemReference, fetchPost);
}

export async function getUser(userName: string, binding?: ServiceBinding) {
  const serviceUser = await getClient(binding)?.getUser(userName);
  return serviceUser ?? fetchUser(userName);
}

export async function getBestStoryIds(binding?: ServiceBinding) {
  const serviceIds = await getClient(binding)?.getBestStoryIds();
  return serviceIds ?? fetchBestStoryIds();
}
