import type { Post } from "~/lib/post";
import type { OfficialItem } from "./codec";
import { isPostComplete } from "./codec";

type PostProvider = "hackerwebapp" | "none" | "official";
type SelectionReason =
  "exact" | "mismatch" | "official-incomplete" | "official-unavailable";

export interface PostSelectionMetric {
  readonly aggregatedCount: number | null;
  readonly durationMs: number;
  readonly officialCount: number | null;
  readonly postId: number;
  readonly reason: SelectionReason;
  readonly selectedProvider: PostProvider;
}

interface PostLoaders {
  readonly getAggregated: () => Promise<Post | null>;
  readonly getOfficialPost: (root: OfficialItem) => Promise<Post | null>;
  readonly getOfficialRoot: () => Promise<OfficialItem | null>;
  readonly report: (metric: PostSelectionMetric) => void;
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function durationSince(start: number) {
  return Math.round((performance.now() - start) * 10) / 10;
}

export async function loadPost(postId: number, loaders: Readonly<PostLoaders>) {
  const start = performance.now();

  // Use one official root snapshot to verify and, if needed, build the post.
  const [aggregatedResult, rootResult] = await Promise.allSettled([
    loaders.getAggregated(),
    loaders.getOfficialRoot(),
  ]);
  const aggregated =
    aggregatedResult.status === "fulfilled" ? aggregatedResult.value : null;
  const root = rootResult.status === "fulfilled" ? rootResult.value : null;
  const aggregatedCount = aggregated?.comments_count ?? null;
  const officialCount = root?.descendants ?? null;

  const report = (reason: SelectionReason, selectedProvider: PostProvider) =>
    loaders.report({
      aggregatedCount,
      durationMs: durationSince(start),
      officialCount,
      postId,
      reason,
      selectedProvider,
    });

  if (aggregated !== null && isPostComplete(aggregated, officialCount)) {
    const reason = officialCount === null ? "official-unavailable" : "exact";
    report(reason, "hackerwebapp");
    return aggregated;
  }

  if (root === null) {
    report("official-unavailable", "none");

    if (aggregatedResult.status === "rejected") {
      throw toError(aggregatedResult.reason);
    }

    return null;
  }

  try {
    const official = await loaders.getOfficialPost(root);
    if (official === null) throw new Error("Official post is unavailable");

    report("mismatch", "official");
    return official;
  } catch (error) {
    report("official-incomplete", "none");
    throw toError(error);
  }
}
