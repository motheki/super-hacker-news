import {
  fetchBestStoryIds,
  fetchItemReference,
  fetchPost,
  fetchTopicItems,
  fetchUser,
} from "~/lib/hacker-news";
import { HnDataClient, type ServiceBinding } from "~/lib/hacker-news/service";
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

function durationSince(start: number) {
  return Math.round((performance.now() - start) * 10) / 10;
}

function logPostLoad(
  postId: number,
  source: "provider-fallback" | "service-fresh" | "service-stale",
  serviceDurationMs: number,
  commentsCount: number | null,
  fallbackDurationMs?: number,
) {
  console.info(
    JSON.stringify({
      commentsCount,
      event: "hn.post_load",
      ...(fallbackDurationMs === undefined ? {} : { fallbackDurationMs }),
      postId,
      serviceDurationMs,
      source,
    }),
  );
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
  const serviceStart = performance.now();
  const result = await client?.getTarget(itemId);
  const serviceDurationMs = durationSince(serviceStart);
  if (result === null || result === undefined) {
    const fallbackStart = performance.now();
    try {
      const target = await resolvePostTarget(
        itemId,
        fallback.loadItem,
        fallback.loadPost,
      );
      logPostLoad(
        target.kind === "post"
          ? target.post.id
          : target.kind === "redirect"
            ? target.rootId
            : itemId,
        "provider-fallback",
        serviceDurationMs,
        target.kind === "post" ? target.post.comments_count : null,
        durationSince(fallbackStart),
      );

      return target;
    } catch (error) {
      logPostLoad(
        itemId,
        "provider-fallback",
        serviceDurationMs,
        null,
        durationSince(fallbackStart),
      );
      throw error;
    }
  }

  const { stale, target } = result;
  logPostLoad(
    target.kind === "post" ? target.post.id : target.rootId,
    stale ? "service-stale" : "service-fresh",
    serviceDurationMs,
    target.kind === "post" ? target.post.comments_count : null,
  );

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
