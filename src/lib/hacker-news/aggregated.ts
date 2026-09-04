import { fetchJson } from "./client";
import {
  parseAggregatedPost,
  parseAggregatedTopics,
  parseAggregatedUser,
} from "./codec";
import type { ContentProvider } from "./provider";
import type { RequestBudget } from "./budget";

const HACKER_WEB_APP = "https://api.hackerwebapp.com";
const HNPWA = "https://api.hnpwa.com/v0";
const FEED_CACHE_SECONDS = 30;
const POST_CACHE_SECONDS = 60;
const POST_TIMEOUT_MS = 800;
const USER_CACHE_SECONDS = 3_600;

function getTopics(topic: string, page: number, budget: RequestBudget) {
  return fetchJson(
    `${HACKER_WEB_APP}/${topic}?page=${page}.json`,
    parseAggregatedTopics,
    {
      cacheTtlSeconds: FEED_CACHE_SECONDS,
      budget,
      operation: "feed",
      provider: "hackerwebapp",
    },
  );
}

function getPost(postId: number, budget: RequestBudget) {
  return fetchJson(`${HACKER_WEB_APP}/item/${postId}`, parseAggregatedPost, {
    cacheTtlSeconds: POST_CACHE_SECONDS,
    budget,
    operation: "post",
    provider: "hackerwebapp",
    retryCount: 0,
    timeoutMs: POST_TIMEOUT_MS,
  });
}

function getUser(userName: string, budget: RequestBudget) {
  return fetchJson(
    `${HNPWA}/user/${encodeURIComponent(userName)}.json`,
    parseAggregatedUser,
    {
      cacheTtlSeconds: USER_CACHE_SECONDS,
      budget,
      operation: "user",
      provider: "hnpwa",
    },
  );
}

export const aggregatedProvider = {
  getPost,
  getTopics,
  getUser,
} satisfies ContentProvider;
