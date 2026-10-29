import { viewerTarget, hackerNewsUrl } from "../lib/viewer-route";
import { toOfficialPost } from "../lib/hacker-news/codec";
import { isSafeExternalUrl } from "../lib/link";
import { ITEMS_PER_PAGE, TOPICS } from "../lib/topic";
import { browserClient } from "./hn-client";
import { node, link, storyMeta, renderFeed } from "./ui";
import { richText } from "./rich-text";
import { discussionSection, mountDiscussion, parentComment } from "./discussion";
const section = document.querySelector<HTMLElement>("[data-viewer]")!;
const status = section.querySelector<HTMLElement>("[data-viewer-status]")!;
const content = section.querySelector<HTMLElement>("[data-viewer-content]")!;
const retry = section.querySelector<HTMLButtonElement>("[data-viewer-retry]")!;
const fallback = section.querySelector<HTMLAnchorElement>("[data-hn-fallback]")!;
const heading = section.querySelector("h1")!;
const target = viewerTarget(new URL(location.href));
if (target) fallback.href = hackerNewsUrl(target);
async function load() {
  if (!target) { status.textContent = "Invalid story, profile, or page."; return; }
  retry.hidden = true; status.textContent = "Loading from Hacker News…";
  const client = browserClient();
  try {
    const fragment = document.createDocumentFragment();
    let discussion: HTMLElement | undefined;
    let parent: Awaited<ReturnType<typeof client.getItem>>;
    if (target.kind === "user") {
      const user = await client.getUser(target.name);
      if (!user) { status.textContent = "Profile not found."; return; }
      heading.textContent = user.id;
      const facts = node("dl", "", "user-facts meta");
      facts.append(node("dt", "Created:"), node("dd", user.created), node("dt", "Karma:"), node("dd", String(user.karma)));
      fragment.append(facts);
      const links = node("p", "", "user-links");
      for (const [path, title] of [["submitted", "submissions"], ["threads", "comments"], ["favorites", "favorites"]]) {
        if (links.childNodes.length) links.append(" / ");
        links.append(link(title!, `https://news.ycombinator.com/${path}?id=${encodeURIComponent(user.id)}`));
      }
      fragment.append(links);
      if (user.about) fragment.append(richText(user.about));
    } else if (target.kind === "feed") {
      const feed = await client.getFeed(target.topic, target.page);
      if (!feed) { status.textContent = "No stories on this page."; return; }
      heading.textContent = `${TOPICS.find(({ name }) => name === target.topic)!.title} stories`;
      const list = node("div", "", "feed");
      list.append(renderFeed(feed.items, (target.page - 1) * ITEMS_PER_PAGE)); fragment.append(list);
      if (target.page > 1) fragment.append(link("Previous stories", `/feed?topic=${target.topic}&page=${target.page - 1}`, "more-link text-link"), " · ");
      if (feed.hasMore) fragment.append(link("More stories…", `/feed?topic=${target.topic}&page=${target.page + 1}`, "more-link text-link"));
    } else {
      parent = await client.getItem(target.id);
      if (!parent) { status.textContent = "Story or comment not found."; return; }
      if (parent.type === "comment") {
        heading.textContent = "Comment thread";
        fragment.append(parentComment(parent));
      } else {
        const post = toOfficialPost(parent, Math.floor(Date.now() / 1000));
        if (!post) { status.textContent = "Story not found."; return; }
        heading.replaceChildren(isSafeExternalUrl(post.url) ? link(post.title, post.url, "story-link") : document.createTextNode(post.title));
        const article = node("article"); article.dataset.testid = "post-content";
        article.append(storyMeta({ ...post, type: parent.type }));
        if (post.content) article.append(richText(post.content));
        fragment.append(article);
      }
      discussion = discussionSection(target.id); fragment.append(discussion);
      if (target.page > 1) fragment.append(link("Previous comments", `/thread?id=${target.id}&page=${target.page - 1}`, "more-link text-link"));
    }
    content.replaceChildren(fragment); status.textContent = "";
    document.title = `${heading.textContent} | Super HN`;
    if (discussion && (target.kind === "item" || target.kind === "thread")) mountDiscussion(discussion, parent!, target.page);
  } catch { status.textContent = "Hacker News could not be reached. Please try again."; retry.hidden = false; }
}
retry.addEventListener("click", () => void load());
void load();
