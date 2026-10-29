import { browserClient } from "./hn-client";
import { renderFeed } from "./ui";
import { ITEMS_PER_PAGE, MAX_FEED_PAGE, type TopicName } from "../lib/topic";
for (const section of document.querySelectorAll<HTMLElement>("[data-live-feed]")) {
  const topic = section.dataset.liveFeed as TopicName;
  const page = Number(section.dataset.page);
  const button = section.querySelector<HTMLButtonElement>("[data-refresh-feed]")!;
  const status = section.querySelector<HTMLElement>("[data-feed-status]")!;
  const list = section.querySelector<HTMLElement>("[data-feed-list]")!;
  button.hidden = false;
  button.addEventListener("click", async () => {
    button.disabled = true; status.textContent = "Refreshing stories…";
    try {
      const feed = await browserClient().getFeed(topic, page);
      if (!feed) throw new Error("Feed unavailable");
      list.replaceChildren(renderFeed(feed.items, (page - 1) * ITEMS_PER_PAGE));
      status.textContent = `Updated ${new Date().toLocaleTimeString()}.`;
      const more = section.querySelector<HTMLAnchorElement>("[data-feed-more]");
      if (more) { more.hidden = !feed.hasMore || page >= MAX_FEED_PAGE; more.href = `/feed?topic=${topic}&page=${page + 1}`; more.textContent = "More live stories…"; }
    } catch { status.textContent = "Could not refresh. The previous stories are still shown. Try again."; }
    finally { button.disabled = false; }
  });
}
// Preserve legacy ?page=N feed bookmarks without a request-time redirect.
const url = new URL(location.href);
const page = url.searchParams.get("page");
if (/^\/(top|new|ask|show)\/?$/.test(url.pathname) && page && /^[1-9]\d*$/.test(page) && Number(page) > 1 && Number(page) <= MAX_FEED_PAGE) {
  location.replace(`/feed?topic=${url.pathname.split("/")[1]}&page=${page}`);
}
