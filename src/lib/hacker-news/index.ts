import { aggregatedProvider } from "./aggregated";
import { getAlgoliaPost } from "./algolia";
import { preferPrimary } from "./client";
import {
  getOfficialBestStoryIds,
  getOfficialItemReference,
  getOfficialPost,
  getOfficialPostRoot,
  getOfficialPostSummary,
  officialProvider,
} from "./official";
import {
  loadCompletePost,
  loadPost,
  type PostSelectionMetric,
} from "./post-loader";

function reportPostSelection(metric: PostSelectionMetric) {
  console.info(JSON.stringify({ event: "hn.post_selection", ...metric }));
}

export async function fetchTopicItems(topic: string, page: number) {
  return preferPrimary(
    "feed",
    () => aggregatedProvider.getTopics(topic, page),
    () => officialProvider.getTopics(topic, page),
  );
}

export async function fetchPost(postId: number) {
  return loadPost(postId, {
    getAggregated: () => aggregatedProvider.getPost(postId),
    getOfficialPost,
    getOfficialRoot: () => getOfficialPostRoot(postId),
    getOfficialSummary: getOfficialPostSummary,
    getSecondary: () => getAlgoliaPost(postId),
    report: reportPostSelection,
  });
}

export function fetchCompletePost(postId: number) {
  return loadCompletePost({
    getFallback: () => fetchPost(postId),
    getOfficial: async () => {
      const root = await getOfficialPostRoot(postId);
      return root === null ? null : getOfficialPost(root);
    },
  });
}

export async function fetchItemReference(itemId: number) {
  return getOfficialItemReference(itemId);
}

export async function fetchUser(userName: string) {
  return preferPrimary(
    "user",
    () => aggregatedProvider.getUser(userName),
    () => officialProvider.getUser(userName),
  );
}

export async function fetchBestStoryIds() {
  return getOfficialBestStoryIds();
}
