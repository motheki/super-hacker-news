import "server-only";
import { fetchJson } from "./client";
import {
  parseAggregatedPost,
  parseAggregatedTopics,
  parseAggregatedUser,
} from "./codec";
import type { ContentProvider } from "./provider";

const HACKER_WEB_APP = "https://api.hackerwebapp.com";
const HNPWA = "https://api.hnpwa.com/v0";

function getTopics(topic: string, page: number) {
  return fetchJson(
    `${HACKER_WEB_APP}/${topic}?page=${page}.json`,
    parseAggregatedTopics,
    { operation: "feed", provider: "hackerwebapp" },
  );
}

function getPost(postId: number) {
  return fetchJson(`${HACKER_WEB_APP}/item/${postId}`, parseAggregatedPost, {
    operation: "post",
    provider: "hackerwebapp",
  });
}

function getUser(userName: string) {
  return fetchJson(
    `${HNPWA}/user/${encodeURIComponent(userName)}.json`,
    parseAggregatedUser,
    { operation: "user", provider: "hnpwa" },
  );
}

export const aggregatedProvider = {
  getPost,
  getTopics,
  getUser,
} satisfies ContentProvider;
