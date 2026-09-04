import {
  fetchBestStoryIds,
  fetchItemReference,
  fetchPost,
  fetchTopicItems,
  fetchUser,
} from "~/lib/hacker-news";
import { resolvePostTarget } from "~/lib/post-target";

interface PostFallback {
  readonly loadItem: typeof fetchItemReference;
  readonly loadPost: typeof fetchPost;
}

const POST_FALLBACK: PostFallback = {
  loadItem: fetchItemReference,
  loadPost: fetchPost,
};

function durationSince(start: number) {
  return Math.round((performance.now() - start) * 10) / 10;
}

function logPostLoad(
  postId: number,
  providerDurationMs: number,
  commentsCount: number | null,
) {
  console.info(
    JSON.stringify({
      commentsCount,
      event: "hn.post_load",
      postId,
      providerDurationMs,
      source: "providers",
    }),
  );
}

export function getTopicItems(topic: string, page: number) {
  return fetchTopicItems(topic, page);
}

export async function getPostTarget(
  itemId: number,
  fallback: PostFallback = POST_FALLBACK,
) {
  const start = performance.now();

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
      durationSince(start),
      target.kind === "post" ? target.post.comments_count : null,
    );

    return target;
  } catch (error) {
    logPostLoad(itemId, durationSince(start), null);
    throw error;
  }
}

export function getUser(userName: string) {
  return fetchUser(userName);
}

export function getBestStoryIds() {
  return fetchBestStoryIds();
}
