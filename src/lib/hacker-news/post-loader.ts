import type { Post } from "~/lib/post";
import type { OfficialItem } from "./codec";

type PostProvider = "algolia" | "hackerwebapp" | "none" | "official";
type SelectionReason =
  | "all-unavailable"
  | "official-fallback"
  | "official-incomplete"
  | "primary"
  | "secondary";

export interface PostSelectionMetric {
  readonly aggregatedCount: number | null;
  readonly secondaryCount: number | null;
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
  readonly getOfficialSummary?: (root: OfficialItem) => Post | null;
  readonly getSecondary: () => Promise<Post | null>;
  readonly report: (metric: PostSelectionMetric) => void;
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function durationSince(start: number) {
  return Math.round((performance.now() - start) * 10) / 10;
}

async function settle<T>(load: () => Promise<T>) {
  try {
    return { status: "fulfilled", value: await load() } as const;
  } catch (reason) {
    return { reason, status: "rejected" } as const;
  }
}

export async function loadPost(postId: number, loaders: Readonly<PostLoaders>) {
  const start = performance.now();
  let aggregatedCount: number | null = null;
  let officialCount: number | null = null;
  let secondaryCount: number | null = null;
  const report = (reason: SelectionReason, selectedProvider: PostProvider) => {
    loaders.report({
      aggregatedCount,
      secondaryCount,
      durationMs: durationSince(start),
      officialCount,
      postId,
      reason,
      selectedProvider,
    });
  };

  // HackerWeb matches Better HN's fast path: one complete-tree request.
  const aggregatedResult = await settle(loaders.getAggregated);
  const aggregated =
    aggregatedResult.status === "fulfilled" ? aggregatedResult.value : null;
  aggregatedCount = aggregated?.comments_count ?? null;

  if (aggregated !== null) {
    report("primary", "hackerwebapp");
    return aggregated;
  }

  // A single item lookup distinguishes comment permalinks from missing posts.
  const rootResult = await settle(loaders.getOfficialRoot);
  const root = rootResult.status === "fulfilled" ? rootResult.value : null;
  officialCount = root?.descendants ?? null;
  const officialSummary =
    root === null ? null : loaders.getOfficialSummary?.(root);

  if (
    root !== null &&
    loaders.getOfficialSummary !== undefined &&
    officialSummary === null
  ) {
    report("all-unavailable", "none");
    return null;
  }

  const secondaryResult = await settle(loaders.getSecondary);
  const secondary =
    secondaryResult.status === "fulfilled" ? secondaryResult.value : null;
  secondaryCount = secondary?.comments_count ?? null;

  if (secondary !== null) {
    report("secondary", "algolia");
    return secondary;
  }

  // The official API remains the complete-tree fallback when bulk APIs miss.
  if (root === null) {
    if (aggregatedResult.status === "rejected") {
      throw toError(aggregatedResult.reason);
    }

    if (secondaryResult.status === "rejected") {
      throw toError(secondaryResult.reason);
    }

    report("all-unavailable", "none");
    return null;
  }

  try {
    const official = await loaders.getOfficialPost(root);
    if (official === null) throw new Error("Official post is unavailable");

    report("official-fallback", "official");
    return official;
  } catch (error) {
    report("official-incomplete", "none");
    throw toError(error);
  }
}
