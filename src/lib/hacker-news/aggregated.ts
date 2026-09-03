import { fetchJson } from "./client";
import {
  parseAggregatedPost,
  parseAggregatedTopics,
  parseAggregatedUser,
} from "./codec";
import type { ContentProvider } from "./provider";

const HACKER_WEB_APP = "https://api.hackerwebapp.com";
const HNPWA = "https://api.hnpwa.com/v0";
const FEED_CACHE_SECONDS = 30;
const POST_CACHE_SECONDS = 15;
const USER_CACHE_SECONDS = 3_600;

function getTopics(topic: string, page: number) {
  return fetchJson(
    `${HACKER_WEB_APP}/${topic}?page=${page}.json`,
    parseAggregatedTopics,
    {
      cacheTtlSeconds: FEED_CACHE_SECONDS,
      operation: "feed",
      provider: "hackerwebapp",
    },
  );
}

function getPost(postId: number) {
  return fetchJson(`${HACKER_WEB_APP}/item/${postId}`, parseAggregatedPost, {
    cacheTtlSeconds: POST_CACHE_SECONDS,
    operation: "post",
    provider: "hackerwebapp",
  });
}

function getUser(userName: string) {
  return fetchJson(
    `${HNPWA}/user/${encodeURIComponent(userName)}.json`,
    parseAggregatedUser,
    {
      cacheTtlSeconds: USER_CACHE_SECONDS,
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
