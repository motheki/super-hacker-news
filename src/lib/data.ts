import {
  fetchBestStoryIds,
  fetchItemReference,
  fetchPost,
  fetchTopicItems,
  fetchUser,
} from "~/lib/hacker-news";
import { RequestBudget } from "~/lib/hacker-news/budget";
import { PostUnavailableError } from "~/lib/hacker-news/post-loader";
import { resolvePostTarget } from "~/lib/post-target";

interface PostFallback {
  readonly loadItem: (
    itemId: number,
    budget: RequestBudget,
  ) => ReturnType<typeof fetchItemReference>;
  readonly loadPost: (
    postId: number,
    budget: RequestBudget,
  ) => ReturnType<typeof fetchPost>;
}

const POST_FALLBACK: PostFallback = {
  loadItem: fetchItemReference,
  loadPost: fetchPost,
};

export class DataUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DataUnavailableError";
  }
}

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

export async function getTopicItems(topic: string, page: number) {
  try {
    return await fetchTopicItems(topic, page);
  } catch (error) {
    throw new DataUnavailableError("The feed providers are unavailable", {
      cause: error,
    });
  }
}

export async function getPostTarget(
  itemId: number,
  fallback: PostFallback = POST_FALLBACK,
) {
  const start = performance.now();
  const budget = new RequestBudget();
  const loadItem = async (currentId: number) => {
    try {
      return await fallback.loadItem(currentId, budget);
    } catch (error) {
      // Parent walks use the official API, so a failed lookup is an outage.
      throw new DataUnavailableError("The item provider is unavailable", {
        cause: error,
      });
    }
  };

  try {
    const target = await resolvePostTarget(itemId, loadItem, (currentId) =>
      fallback.loadPost(currentId, budget),
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
    if (error instanceof PostUnavailableError) {
      throw new DataUnavailableError("The post providers are unavailable", {
        cause: error,
      });
    }

    throw error;
  }
}

export async function getUser(userName: string) {
  try {
    return await fetchUser(userName);
  } catch (error) {
    throw new DataUnavailableError("The user providers are unavailable", {
      cause: error,
    });
  }
}

export function getBestStoryIds() {
  return fetchBestStoryIds();
}
