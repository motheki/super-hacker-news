import type { Post } from "~/lib/post";
import { SITE_URL } from "~/lib/site";
import { parseAggregatedPost } from "./codec";
import { PostUnavailableError } from "./post-loader";

const CACHE_NAME = "super-hn-posts-v1";
const MAX_AGE_MS = 60 * 60 * 1_000;

export interface PostCache {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
  delete(key: string): Promise<boolean>;
}

type PostCacheOutcome =
  | { readonly outcome: "stale"; readonly ageMs: number }
  | { readonly outcome: "cache-failure"; readonly operation: "open" | "read" | "write" | "delete" };

export type PostCacheMetric = PostCacheOutcome & {
  readonly event: "hn.post_cache";
  readonly postId: number;
};

export interface PostCacheDependencies {
  readonly openCache?: (name: string) => Promise<PostCache | undefined>;
  /** Epoch milliseconds, sampled after a successful load (not before it). */
  readonly now?: () => number;
  readonly report?: (metric: PostCacheMetric) => void;
}

// Resolve the runtime API only when called within a request, never at module scope.
async function openRuntimeCache(name: string): Promise<PostCache | undefined> {
  return typeof caches === "undefined" ? undefined : await caches.open(name);
}

function reportMetric(metric: PostCacheMetric) {
  console.info(JSON.stringify(metric));
}

/** Provider-first, best-effort last-known-good fallback; call inside a request. */
export async function withPostCache(
  postId: number,
  load: () => Promise<Post | null>,
  dependencies: PostCacheDependencies = {},
): Promise<Post | null> {
  if (!Number.isSafeInteger(postId) || postId <= 0) {
    throw new RangeError("Post ID must be a positive safe integer");
  }

  const now = dependencies.now ?? Date.now;
  const key = new URL(`/__internal/hn-post-cache/${postId}`, SITE_URL).href;
  const report = (detail: PostCacheOutcome) => {
    // Observability must not change either the provider result or its error.
    try {
      (dependencies.report ?? reportMetric)({ event: "hn.post_cache", postId, ...detail });
    } catch {
      // Never log arbitrary cache/provider/logger errors or their causes.
    }
  };
  const openCache = async () => {
    try {
      return await (dependencies.openCache ?? openRuntimeCache)(CACHE_NAME);
    } catch {
      report({ outcome: "cache-failure", operation: "open" });
      return undefined;
    }
  };

  let post: Post | null;
  try {
    post = await load();
  } catch (error) {
    if (!(error instanceof PostUnavailableError)) throw error;

    const cache = await openCache();
    if (cache !== undefined) {
      try {
        const response = await cache.match(key);
        if (response !== undefined) {
          const envelope: unknown = await response.json();
          if (
            response.status === 200 &&
            typeof envelope === "object" && envelope !== null &&
            "loadedAt" in envelope && typeof envelope.loadedAt === "number" &&
            Number.isFinite(envelope.loadedAt) && envelope.loadedAt >= 0 &&
            "post" in envelope
          ) {
            const restored = parseAggregatedPost(envelope.post);
            // Check after reading/parsing too: cache I/O must not extend eligibility.
            const ageMs = now() - envelope.loadedAt;
            if (restored?.id === postId && ageMs >= 0 && ageMs < MAX_AGE_MS) {
              report({ outcome: "stale", ageMs });
              return { ...restored, stale: true };
            }
          }
        }
      } catch {
        report({ outcome: "cache-failure", operation: "read" });
      }
    }
    throw error;
  }

  const loadedAt = now();
  const cache = await openCache();
  if (cache === undefined) return post;

  if (post === null) {
    try {
      await cache.delete(key);
    } catch {
      report({ outcome: "cache-failure", operation: "delete" });
    }
    return null;
  }

  try {
    const normalized = parseAggregatedPost(post);
    const remainingSeconds = Math.floor((MAX_AGE_MS - (now() - loadedAt)) / 1_000);
    if (
      normalized?.id === postId && Number.isFinite(loadedAt) && loadedAt >= 0 &&
      remainingSeconds > 0 && remainingSeconds <= MAX_AGE_MS / 1_000
    ) {
      await cache.put(key, new Response(JSON.stringify({ loadedAt, post: normalized }), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${remainingSeconds}`,
        },
      }));
    }
  } catch {
    report({ outcome: "cache-failure", operation: "write" });
  }
  return post;
}
