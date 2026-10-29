import { isSafeExternalUrl } from "../lib/link";
import type { TopicItem } from "../lib/topic";
export function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = "", className?: string) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}
export function link(text: string, href: string, className = "text-link") {
  const element = node("a", text, className);
  element.href = href;
  if (isSafeExternalUrl(href)) element.rel = "noreferrer noopener";
  return element;
}
export function storyMeta(item: TopicItem) {
  const meta = node("p", `${item.points ?? 0} points`, "meta");
  if (item.user) meta.append(" by ", link(item.user, `/user?name=${encodeURIComponent(item.user)}`));
  meta.append(` ${item.time_ago} | `, link(`${item.comments_count} ${item.comments_count === 1 ? "comment" : "comments"}`, `/item?id=${item.id}`));
  return meta;
}
export function renderFeed(items: TopicItem[], offset = 0) {
  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const article = node("article", "", "feed-item");
    const heading = node("h2");
    heading.append(link(item.title, isSafeExternalUrl(item.url) ? item.url : `/item?id=${item.id}`, "story-link"));
    if (item.domain) heading.append(node("span", ` (${item.domain})`, "faint domain"));
    article.append(heading, item.type === "job" ? node("p", item.time_ago, "meta") : storyMeta(item));
    fragment.append(node("span", String(offset + index + 1), "feed-index"), article);
  });
  return fragment;
}
