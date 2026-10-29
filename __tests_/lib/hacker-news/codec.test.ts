import { expect, test } from "bun:test";
import { parseNumberArray, parseOfficialItem, toComment, toOfficialPost } from "../../../src/lib/hacker-news/codec";
import { STORY } from "../../fixtures/hacker-news";

test("validates IDs and optional API fields at the boundary", () => {
  expect(parseNumberArray([1, 2])).toEqual([1, 2]);
  for (const value of [[0], [1.5], [NaN], [Infinity], ["2"]]) expect(parseNumberArray(value)).toBeNull();
  expect(parseOfficialItem({ id: 2, type: "comment", deleted: true })).not.toBeNull();
  expect(parseOfficialItem({ ...STORY, kids: [-1] })).toBeNull();
  expect(parseOfficialItem({ ...STORY, time: Infinity })).toBeNull();
});
test("keeps the official descendant count independently of loaded comments", () => {
  expect(toOfficialPost(STORY, STORY.time! + 120)).toMatchObject({
    comments_count: 2000, domain: "example.com", points: 42, time_ago: "2 minutes ago", user: "alice",
  });
});
test("deleted and dead bodies are not exposed, but their replies remain reachable", () => {
  const comment = toComment({ id: 2, type: "comment", text: "removed", deleted: true, kids: [3] }, 0);
  expect(comment.content).toBeUndefined();
  expect(comment.replyCount).toBe(1);
});
