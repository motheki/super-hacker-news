import type { Post } from "~/lib/post";
import type { OfficialItem } from "./codec";
import { isPostComplete } from "./codec";

type PostProvider = "algolia" | "hackerwebapp" | "none" | "official";
type SelectionReason =
  | "aggregate-ahead"
  | "aggregate-behind"
  | "bulk-divergent"
  | "exact"
  | "mismatch"
  | "official-budget"
  | "official-incomplete"
  | "official-unavailable";

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

const OFFICIAL_COMMENT_BUDGET = 20;

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function durationSince(start: number) {
  return Math.round((performance.now() - start) * 10) / 10;
}

function commentIds(post: Post) {
  const ids = new Set<number>();
  const queue = [...post.comments];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const comment = queue[cursor];
    if (comment === undefined) continue;

    ids.add(comment.id);
    queue.push(...comment.comments);
  }

  return ids;
}

function isSubset(left: ReadonlySet<number>, right: ReadonlySet<number>) {
  for (const id of left) {
    if (!right.has(id)) return false;
  }

  return true;
}

function selectBulk(primary: Post | null, secondary: Post | null) {
  if (primary === null) {
    return {
      post: secondary,
      provider: secondary === null ? "none" : "algolia",
    } as const;
  }
  if (secondary === null) {
    return { post: primary, provider: "hackerwebapp" } as const;
  }

  const primaryIds = commentIds(primary);
  const secondaryIds = commentIds(secondary);
  if (
    isSubset(primaryIds, secondaryIds) &&
    secondaryIds.size > primaryIds.size
  ) {
    return { post: secondary, provider: "algolia" } as const;
  }
  if (isSubset(secondaryIds, primaryIds)) {
    return { post: primary, provider: "hackerwebapp" } as const;
  }

  return secondary.comments_count > primary.comments_count
    ? ({ post: secondary, provider: "algolia", divergent: true } as const)
    : ({ post: primary, provider: "hackerwebapp", divergent: true } as const);
}

export async function loadPost(postId: number, loaders: Readonly<PostLoaders>) {
  const start = performance.now();

  // Use one official root snapshot to verify and, if needed, build the post.
  const [aggregatedResult, secondaryResult, rootResult] =
    await Promise.allSettled([
      loaders.getAggregated(),
      loaders.getSecondary(),
      loaders.getOfficialRoot(),
    ]);
  const aggregated =
    aggregatedResult.status === "fulfilled" ? aggregatedResult.value : null;
  const root = rootResult.status === "fulfilled" ? rootResult.value : null;
  const secondary =
    secondaryResult.status === "fulfilled" ? secondaryResult.value : null;
  const selection = selectBulk(aggregated, secondary);
  const bulk = selection.post;
  const aggregatedCount = aggregated?.comments_count ?? null;
  const secondaryCount = secondary?.comments_count ?? null;
  const officialCount = root?.descendants ?? null;

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

  if (bulk !== null && isPostComplete(bulk, officialCount)) {
    const reason =
      officialCount === null
        ? "official-unavailable"
        : selection.divergent === true
          ? "bulk-divergent"
          : bulk.comments_count === officialCount
            ? "exact"
            : "aggregate-ahead";
    report(reason, selection.provider);
    return bulk;
  }

  if (root === null) {
    if (bulk !== null) {
      report("official-unavailable", selection.provider);
      return bulk;
    }

    if (aggregatedResult.status === "rejected") {
      throw toError(aggregatedResult.reason);
    }

    if (secondaryResult.status === "rejected") {
      throw toError(secondaryResult.reason);
    }

    report("official-unavailable", "none");
    return null;
  }

  if ((officialCount ?? 0) > OFFICIAL_COMMENT_BUDGET) {
    if (bulk !== null) {
      report("official-budget", selection.provider);
      return bulk;
    }

    const summary = loaders.getOfficialSummary?.(root) ?? null;
    report("official-budget", summary === null ? "none" : "official");
    return summary;
  }

  try {
    const official = await loaders.getOfficialPost(root);
    if (official === null) throw new Error("Official post is unavailable");

    if (bulk !== null && official.comments_count <= bulk.comments_count) {
      report("aggregate-behind", selection.provider);
      return bulk;
    }

    report("mismatch", "official");
    return official;
  } catch (error) {
    if (bulk !== null) {
      report("aggregate-behind", selection.provider);
      return bulk;
    }

    report("official-incomplete", "none");
    throw toError(error);
  }
}
