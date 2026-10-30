import type { Post } from "~/lib/post";
import type { BudgetSnapshot } from "./budget";
import type { OfficialItem } from "./codec";

type PostProvider = "algolia" | "hackerwebapp" | "none" | "official";
type SelectionReason =
  | "all-unavailable"
  | "budget-exhausted"
  | "official-fallback"
  | "official-incomplete"
  | "primary"
  | "secondary"
  | "verified-empty"
  | "empty-unverified";

export interface PostSelectionMetric {
  readonly aggregatedCount: number | null;
  readonly secondaryCount: number | null;
  readonly durationMs: number;
  readonly officialCount: number | null;
  readonly postId: number;
  readonly reason: SelectionReason;
  readonly selectedProvider: PostProvider;
  readonly subrequestsRemaining?: number;
  readonly subrequestsUsed?: number;
}

interface PostLoaders {
  readonly canLoadOfficial?: (root: OfficialItem) => boolean;
  readonly getAggregated: () => Promise<Post | null>;
  readonly getOfficialPost: (root: OfficialItem) => Promise<Post | null>;
  readonly getOfficialRoot: () => Promise<OfficialItem | null>;
  readonly getOfficialSummary?: (root: OfficialItem) => Post | null;
  readonly getSecondary: () => Promise<Post | null>;
  readonly getBudget?: () => BudgetSnapshot;
  readonly report: (metric: PostSelectionMetric) => void;
}

export class PostUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PostUnavailableError";
  }
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
      ...loaders.getBudget?.(),
    });
  };

  // Preserve the single-request fast path for populated bulk trees. An empty
  // tree can be a partial upstream response, even when its HTTP status is 200.
  const aggregatedResult = await settle(loaders.getAggregated);
  const aggregated = aggregatedResult.status === "fulfilled" ? aggregatedResult.value : null;
  aggregatedCount = aggregated?.comments_count ?? null;

  if (aggregated !== null && aggregated.comments.length > 0) {
    report("primary", "hackerwebapp");
    return aggregated;
  }

  // On a miss, start both fallbacks. For an empty primary, first check whether
  // the story really has no comments, avoiding an unnecessary secondary read.
  const secondaryResultPromise = aggregated === null ? settle(loaders.getSecondary) : null;
  const rootResult = await settle(loaders.getOfficialRoot);
  const root = rootResult.status === "fulfilled" ? rootResult.value : null;
  officialCount = root?.descendants ?? null;
  const officialSummary = root === null ? null : loaders.getOfficialSummary?.(root);

  if (root !== null && loaders.getOfficialSummary !== undefined && officialSummary === null) {
    void secondaryResultPromise;
    report("all-unavailable", "none");
    return null;
  }

  const verifiedEmpty = root !== null &&
    (root.descendants ?? 0) === 0 && (root.kids?.length ?? 0) === 0;
  if (aggregated !== null && verifiedEmpty) {
    report("verified-empty", "hackerwebapp");
    return aggregated;
  }

  const secondaryResult = await (secondaryResultPromise ?? settle(loaders.getSecondary));
  const secondary = secondaryResult.status === "fulfilled" ? secondaryResult.value : null;
  secondaryCount = secondary?.comments_count ?? null;

  if (secondary !== null && (secondary.comments.length > 0 || verifiedEmpty)) {
    report(secondary.comments.length > 0 ? "secondary" : "verified-empty", "algolia");
    return secondary;
  }

  // Neither bulk provider may turn an unverified empty tree into a cacheable
  // success. Throw so last-known-good data can be used during a provider outage.
  if (root === null && (aggregated !== null || secondary !== null)) {
    report("empty-unverified", "none");
    throw new PostUnavailableError("An empty comment tree could not be verified");
  }

  // The official API remains the complete-tree fallback when bulk APIs miss.
  if (root === null) {
    const providerFailed =
      aggregatedResult.status === "rejected" ||
      rootResult.status === "rejected" ||
      secondaryResult.status === "rejected";
    if (providerFailed) {
      const cause =
        aggregatedResult.status === "rejected"
          ? aggregatedResult.reason
          : rootResult.status === "rejected"
            ? rootResult.reason
            : secondaryResult.status === "rejected"
              ? secondaryResult.reason
              : undefined;

      report("all-unavailable", "none");
      throw new PostUnavailableError("Every post provider is unavailable", {
        cause,
      });
    }

    report("all-unavailable", "none");
    return null;
  }

  if (loaders.canLoadOfficial?.(root) === false) {
    report("budget-exhausted", "none");
    throw new PostUnavailableError("The official comment tree exceeds the request budget");
  }

  try {
    const official = await loaders.getOfficialPost(root);
    if (official === null) throw new Error("Official post is unavailable");

    report("official-fallback", "official");
    return official;
  } catch (error) {
    report("official-incomplete", "none");
    throw new PostUnavailableError("Every complete post provider failed", {
      cause: toError(error),
    });
  }
}
