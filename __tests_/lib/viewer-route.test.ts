import { expect, test } from "bun:test";
import { legacyViewerUrl, viewerTarget } from "../../src/lib/viewer-route";
const url = (path: string) => new URL(path, "https://superhn.org");
test("recovers legacy story, thread, profile and feed bookmarks", () => {
  for (const [input, expected] of [["/post/123/", "/item?id=123"], ["/post/123#comments", "/item?id=123#comments"], ["/thread/123/2", "/thread?id=123&page=2"], ["/user/alice", "/user?name=alice"], ["/top/5", "/feed?topic=top&page=5"]]) expect(legacyViewerUrl(url(input!))).toBe(expected!);
  for (const path of ["/post/0", "/post/nope", "/top/18", "/thread/1/nope", "/user/%ZZ", "/user/%2F", "/unknown"]) expect(legacyViewerUrl(url(path))).toBeNull();
});
test("static viewer targets validate their query parameters", () => {
  expect(viewerTarget(url("/item?id=123"))).toEqual({ kind: "item", id: 123, page: 1 });
  expect(viewerTarget(url("/thread?id=2&page=3"))).toEqual({ kind: "thread", id: 2, page: 3 });
  expect(viewerTarget(url("/user?name=alice"))).toEqual({ kind: "user", name: "alice" });
  for (const path of ["/item", "/item?id=0", "/item?id=1e2", "/thread?id=1&page=0", "/feed?topic=bad", "/feed?page=18", "/user?name=%2F", "/user?name="]) expect(viewerTarget(url(path))).toBeNull();
});
