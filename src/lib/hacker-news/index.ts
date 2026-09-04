import { aggregatedProvider } from "./aggregated";
import { getAlgoliaPost } from "./algolia";
import { RequestBudget } from "./budget";
import { preferPrimary } from "./client";
import {
  getOfficialBestStoryIds,
  getOfficialItemReference,
  getOfficialPost,
  getOfficialPostRoot,
  getOfficialPostSummary,
  officialProvider,
} from "./official";
import { loadPost, type PostSelectionMetric } from "./post-loader";

function reportPostSelection(metric: PostSelectionMetric) {
  console.info(JSON.stringify({ event: "hn.post_selection", ...metric }));
}

export async function fetchTopicItems(
  topic: string,
  page: number,
  budget = new RequestBudget(),
) {
  return preferPrimary(
    "feed",
    () => aggregatedProvider.getTopics(topic, page, budget),
    () => officialProvider.getTopics(topic, page, budget),
  );
}

export async function fetchPost(postId: number, budget = new RequestBudget()) {
  return loadPost(postId, {
    canLoadOfficial: (root) => {
      const descendants = root.descendants;
      return descendants === undefined || budget.canTake(descendants, 1);
    },
    getAggregated: () => aggregatedProvider.getPost(postId, budget),
    getBudget: () => budget.snapshot(),
    getOfficialPost: (root) => getOfficialPost(root, budget),
    getOfficialRoot: () => getOfficialPostRoot(postId, budget),
    getOfficialSummary: getOfficialPostSummary,
    getSecondary: () => getAlgoliaPost(postId, budget),
    report: reportPostSelection,
  });
}

export async function fetchItemReference(
  itemId: number,
  budget = new RequestBudget(),
) {
  return getOfficialItemReference(itemId, budget);
}

export async function fetchUser(
  userName: string,
  budget = new RequestBudget(),
) {
  return preferPrimary(
    "user",
    () => aggregatedProvider.getUser(userName, budget),
    () => officialProvider.getUser(userName, budget),
  );
}

export async function fetchBestStoryIds(budget = new RequestBudget()) {
  return getOfficialBestStoryIds(budget);
}
