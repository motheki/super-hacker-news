import { isTopicName, isValidUserName, parsePage, parsePostId } from "./route";
export type ViewerTarget = { kind: "item" | "thread"; id: number; page: number } | { kind: "user"; name: string } | { kind: "feed"; topic: import("./topic").TopicName; page: number };
export function viewerTarget(url: URL): ViewerTarget | null {
  const path = url.pathname.replace(/\/$/, "");
  if (path === "/item" || path === "/thread") {
    const id = parsePostId(url.searchParams.get("id") ?? "");
    const page = parsePostId(url.searchParams.get("page") ?? "1");
    return id !== null && page !== null ? { kind: path === "/item" ? "item" : "thread", id, page } : null;
  }
  if (path === "/user") {
    const name = url.searchParams.get("name") ?? "";
    return isValidUserName(name) ? { kind: "user", name } : null;
  }
  if (path === "/feed") {
    const topic = url.searchParams.get("topic") ?? "top";
    const page = parsePage(url.searchParams.get("page") ?? undefined);
    return isTopicName(topic) && page !== null ? { kind: "feed", topic, page } : null;
  }
  return null;
}
/** Recover old bookmarks without a Worker catch-all or a site-wide SPA fallback. */
export function legacyViewerUrl(url: URL): string | null {
  const parts = url.pathname.replace(/\/+$/, "").split("/").slice(1);
  if (parts[0] === "post" && parts.length === 2 && parsePostId(parts[1]!)) return `/item?id=${parts[1]}${url.hash}`;
  if (parts[0] === "thread" && (parts.length === 2 || parts.length === 3) && parsePostId(parts[1]!) && parsePostId(parts[2] ?? "1")) return `/thread?id=${parts[1]}&page=${parts[2] ?? 1}${url.hash}`;
  if (parts[0] === "user" && parts.length === 2) {
    try {
      const name = decodeURIComponent(parts[1]!);
      if (isValidUserName(name)) return `/user?name=${encodeURIComponent(name)}`;
    } catch { return null; }
  }
  if (parts.length === 2 && isTopicName(parts[0]!) && parsePage(parts[1]) !== null) return `/feed?topic=${parts[0]}&page=${parts[1]}`;
  return null;
}
export function hackerNewsUrl(target: ViewerTarget) {
  if (target.kind === "user") return `https://news.ycombinator.com/user?id=${encodeURIComponent(target.name)}`;
  if (target.kind === "feed") return `https://news.ycombinator.com/${({ top: "news", new: "newest", ask: "ask", show: "show" })[target.topic]}?p=${target.page}`;
  return `https://news.ycombinator.com/item?id=${target.id}`;
}
