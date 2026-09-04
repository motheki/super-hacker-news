import {
  fetchBestStoryIds,
  fetchItemReference,
  fetchPost,
  fetchTopicItems,
  fetchUser,
} from "~/lib/hacker-news";
import { isPostComplete } from "~/lib/hacker-news/codec";
import { HnDataClient, type ServiceBinding } from "~/lib/hacker-news/service";
import { isRootItemType } from "~/lib/item";
import { resolvePostTarget } from "~/lib/post-target";

interface PostFallback {
  readonly loadItem: typeof fetchItemReference;
  readonly loadPost: typeof fetchPost;
}

const POST_FALLBACK: PostFallback = {
  loadItem: fetchItemReference,
  loadPost: fetchPost,
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
  const result = await client?.getTarget(itemId);
  if (result === null || result === undefined) {
    return resolvePostTarget(itemId, fallback.loadItem, fallback.loadPost);
  }

  const { stale, target } = result;
  if (!stale || target.kind === "redirect") return target;

  try {
    const root = await fallback.loadItem(itemId);
    if (
      root === null ||
      root.id !== itemId ||
      !isRootItemType(root.type) ||
      target.post.id !== itemId
    ) {
      return target;
    }

    const live = await fallback.loadPost(itemId);
    if (
      live !== null &&
      live.id === itemId &&
      live.comments_count >= target.post.comments_count &&
      isPostComplete(live, root.descendants ?? 0)
    ) {
      return { kind: "post", post: live } as const;
    }
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: "hn.stale_fallback",
        itemId,
        message: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  return target;
}

export async function getUser(userName: string, binding?: ServiceBinding) {
  const serviceUser = await getClient(binding)?.getUser(userName);
  return serviceUser ?? fetchUser(userName);
}

export async function getBestStoryIds(binding?: ServiceBinding) {
  const serviceIds = await getClient(binding)?.getBestStoryIds();
  return serviceIds ?? fetchBestStoryIds();
}
