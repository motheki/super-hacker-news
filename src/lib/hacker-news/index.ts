import { aggregatedProvider } from "./aggregated";
import { preferPrimary } from "./client";
import {
  getOfficialBestStoryIds,
  getOfficialItemReference,
  getOfficialPost,
  getOfficialPostRoot,
  officialProvider,
} from "./official";
import { loadPost, type PostSelectionMetric } from "./post-loader";

function reportPostSelection(metric: PostSelectionMetric) {
  console.info("hn.post_selection", metric);
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
    report: reportPostSelection,
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
